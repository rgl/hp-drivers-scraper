# About

[![Build status](https://github.com/rgl/hp-drivers-scraper/workflows/build/badge.svg)](https://github.com/rgl/hp-drivers-scraper/actions?query=workflow%3Abuild)

This scrapes the HP Product Drivers page into a JSON data file.

## Products

* [HP EliteDesk 800 65W G4 Desktop Mini PC](https://support.hp.com/us-en/drivers/selfservice/hp-elitedesk-800-65w-g4-desktop-mini-pc/21353734)
* [HP EliteDesk 800 35W G2 Desktop Mini PC](https://support.hp.com/us-en/drivers/selfservice/hp-elitedesk-800-35w-g2-desktop-mini-pc/7633266)

## Data Files

The code in this repository creates a `data/*.json` file, for example:

```json
[
    {
        "name": "HP Firmware Pack (Q21)",
        "url": "https://ftp.hp.com/pub/softpaq/sp143001-143500/sp143306.exe",
        "version": "02.21.00 Rev.A",
        "date": "2022-11-08T00:00:00.000Z"
    },
]
```

To get the BIOS and the Intel ME Windows drivers download URLs, you can use something like:

```bash
jq -r '[.[] | select(.name == "HP Firmware Pack (Q21)")] | first' data/hp-elitedesk-800-65w-g4-desktop-mini-pc.json
jq -r '[.[] | select(.name == "Intel Management Engine Driver")] | first' data/hp-elitedesk-800-65w-g4-desktop-mini-pc.json
```
