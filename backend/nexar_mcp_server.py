"""
Nexar MCP Server — exposes Octopart/Nexar component lookup as MCP tools.

Run standalone:
    python nexar_mcp_server.py

The server exposes two tools:
  - search_components: search by keyword or description
  - get_component_specs: look up a specific part by MPN
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

load_dotenv()

NEXAR_TOKEN_URL = "https://identity.nexar.com/connect/token"
NEXAR_GRAPHQL_URL = "https://api.nexar.com/graphql"

CLIENT_ID = os.getenv("NEXAR_CLIENT_ID")
CLIENT_SECRET = os.getenv("NEXAR_CLIENT_SECRET")

# ---------------------------------------------------------------------------
# Token management (client credentials flow)
# ---------------------------------------------------------------------------

_token_cache: dict = {"token": None, "expires_at": 0}

async def get_access_token() -> str:
    import time
    if _token_cache["token"] and time.time() < _token_cache["expires_at"] - 60:
        return _token_cache["token"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            NEXAR_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = time.time() + data.get("expires_in", 3600)
        return _token_cache["token"]


# ---------------------------------------------------------------------------
# GraphQL queries
# ---------------------------------------------------------------------------

SEARCH_QUERY = """
query SearchComponents($q: String!, $limit: Int!) {
  supSearch(q: $q, limit: $limit) {
    results {
      part {
        mpn
        manufacturer { name }
        shortDescription
        specs {
          attribute { name shortname }
          displayValue
        }
        bestDatasheet { url }
      }
    }
  }
}
"""

MPN_QUERY = """
query GetComponent($mpn: String!) {
  supParts(mpns: [$mpn]) {
    mpn
    manufacturer { name }
    shortDescription
    specs {
      attribute { name shortname }
      displayValue
    }
    bestDatasheet { url }
    medianPrice1000 { price currency }
  }
}
"""

async def nexar_graphql(query: str, variables: dict) -> dict:
    token = await get_access_token()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            NEXAR_GRAPHQL_URL,
            json={"query": query, "variables": variables},
            headers={"Authorization": f"Bearer {token}"},
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# MCP Server
# ---------------------------------------------------------------------------

server = Server("nexar-component-lookup")


@server.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="search_components",
            description=(
                "Search the Nexar/Octopart database for electronic components by keyword, "
                "description, or part number fragment. Returns specs, manufacturer, and datasheet links."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search term, e.g. '10k resistor', 'NE555', 'blue LED 3mm'",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results to return (default 5, max 10)",
                        "default": 5,
                    },
                },
                "required": ["query"],
            },
        ),
        types.Tool(
            name="get_component_specs",
            description=(
                "Look up detailed specs for a specific component by its manufacturer part number (MPN). "
                "Returns full specs, datasheet URL, and pricing."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "mpn": {
                        "type": "string",
                        "description": "Manufacturer part number, e.g. 'LM741CN', 'ATmega328P-PU'",
                    },
                },
                "required": ["mpn"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "search_components":
        query = arguments["query"]
        limit = min(int(arguments.get("limit", 5)), 10)

        data = await nexar_graphql(SEARCH_QUERY, {"q": query, "limit": limit})
        results = data.get("data", {}).get("supSearch", {}).get("results", [])

        if not results:
            return [types.TextContent(type="text", text=f"No components found for '{query}'.")]

        lines = [f"Search results for '{query}':\n"]
        for r in results:
            part = r["part"]
            mpn = part.get("mpn", "N/A")
            mfr = part.get("manufacturer", {}).get("name", "N/A")
            desc = part.get("shortDescription", "No description")
            datasheet = part.get("bestDatasheet", {})
            ds_url = datasheet.get("url", "") if datasheet else ""

            lines.append(f"• {mpn} — {mfr}")
            lines.append(f"  {desc}")

            # Key specs
            specs = part.get("specs", [])[:6]
            for spec in specs:
                attr = spec.get("attribute", {}).get("name", "")
                val = spec.get("displayValue", "")
                if attr and val:
                    lines.append(f"  {attr}: {val}")

            if ds_url:
                lines.append(f"  Datasheet: {ds_url}")
            lines.append("")

        return [types.TextContent(type="text", text="\n".join(lines))]

    elif name == "get_component_specs":
        mpn = arguments["mpn"]

        data = await nexar_graphql(MPN_QUERY, {"mpn": mpn})
        parts = data.get("data", {}).get("supParts", [])

        if not parts:
            return [types.TextContent(type="text", text=f"No component found for MPN '{mpn}'.")]

        part = parts[0]
        mfr = part.get("manufacturer", {}).get("name", "N/A")
        desc = part.get("shortDescription", "No description")
        datasheet = part.get("bestDatasheet", {})
        ds_url = datasheet.get("url", "") if datasheet else ""
        price_info = part.get("medianPrice1000")

        lines = [
            f"Component: {mpn}",
            f"Manufacturer: {mfr}",
            f"Description: {desc}",
        ]

        if price_info:
            lines.append(f"Price (per 1000): {price_info['price']} {price_info['currency']}")

        if ds_url:
            lines.append(f"Datasheet: {ds_url}")

        specs = part.get("specs", [])
        if specs:
            lines.append("\nSpecs:")
            for spec in specs:
                attr = spec.get("attribute", {}).get("name", "")
                val = spec.get("displayValue", "")
                if attr and val:
                    lines.append(f"  {attr}: {val}")

        return [types.TextContent(type="text", text="\n".join(lines))]

    else:
        return [types.TextContent(type="text", text=f"Unknown tool: {name}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
