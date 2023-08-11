"use strict";

// install dependencies:
//
//      npm install
//
// execute:
//
// NB to troubleshoot uncomment $env:DEBUG and set {headless:false,dumpio:true} in main.js.
//
//      $env:DEBUG = 'puppeteer:*'
//      node main.js

import { program } from "commander";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

function log() {
    console.log.apply(console, [new Date().toISOString(), ...arguments]);
}

async function getDrivers(page, url) {
    log(`Loading ${url}...`);
    await page.goto(url);

    log("Rejecting cookies...");
    const moreOptionsCookiesSelector = '#onetrust-pc-btn-handler';
    try {
        await page.waitForSelector(moreOptionsCookiesSelector, {timeout: 1500});
        await page.click(moreOptionsCookiesSelector);
        const rejectCookiesSelector = 'button.ot-pc-refuse-all-handler';
        await page.waitForSelector(rejectCookiesSelector);
        await page.click(rejectCookiesSelector);
        await page.waitForTimeout(500);
    } catch {
        // ignore. this is expected in countries without cookies consent.
    }

    log("Selecting the OS...");
    const selectOSNameSelector = ".chooseOSContainer .commonOSBox:nth-child(1) .optOSdropdownHeader";
    await page.waitForSelector(selectOSNameSelector, {visible: true});
    await page.click(selectOSNameSelector);
    await page.click(".chooseOSContainer .commonOSBox:nth-child(1) .optOSdropdownList li:nth-last-child(1)");
    await page.click(".chooseOSContainer .commonOSBox:nth-child(2) .optOSdropdownHeader");
    await page.click(".chooseOSContainer .commonOSBox:nth-child(2) .optOSdropdownList li:nth-last-child(1)");
    await page.click("#FindMyDriver.OSdetailsSubmitBtn");

    log("Waiting for the downloads table...");
    const showAllDriversSelector = "#Show-All-Drivers";
    await page.waitForSelector(showAllDriversSelector, {visible: true});
    await page.click(showAllDriversSelector);

    log("Getting data from the downloads table...");
    return await page.evaluate(() => {
        // e.g. Nov 8, 2022
        const dateRe = /(?<month>[A-Za-z]+) 0?(?<day>[0-9]+), (?<year>[0-9]+)/;
        const dateMonths = {
            Jan: 1,
            Feb: 2,
            Mar: 3,
            Apr: 4,
            May: 5,
            Jun: 6,
            Jul: 7,
            Aug: 8,
            Sep: 9,
            Oct: 10,
            Nov: 11,
            Dec: 12,
        }
        function parseDate(s) {
            const m = dateRe.exec(s);
            const day = parseInt(m.groups.day, 10);
            const month = dateMonths[m.groups.month];
            const year = parseInt(m.groups.year, 10);
            return new Date(Date.UTC(year, month - 1, day));
        }
        const data = [];
        const downloadEls = document.querySelectorAll("#download-table a[title='Download']");
        for (const downloadEl of downloadEls) {
            const name = downloadEl.getAttribute("utilitytitle");
            const trEl = downloadEl.parentElement.parentElement;
            const versionEl = trEl.querySelector("td[data-sort='version']");
            if (!versionEl) {
                continue
            }
            var version = versionEl.innerText;
            if (name == "HP EliteDesk 800 G2 DM System BIOS (N21)") {
                // NB at some point, they've broken the version by adding a "00." prefix; this removes it.
                version = version.replaceAll(/^0+\./g, '');
            }
            const date = parseDate(trEl.querySelector("td[data-sort='date']").innerText.trim());
            data.push({
                name: name,
                url: downloadEl.getAttribute("href"),
                version: version,
                date: date.toISOString(),
            });
        }
        return data;
    });
}

async function main(options) {
    var browserConfig = {
        args: [
            "--start-maximized"
        ],
        headless: "new",
    };
    if (options.debug) {
        browserConfig = {
            ...browserConfig,
            headless: false,
            devtools: true,
            slowMo: 250,
            dumpio: false,
        };
    }

    log("Launching the browser...");
    const browser = await puppeteer.launch(browserConfig);
    try {
        log("Creating a new browser page...");
        const page = await browser.newPage();
        await page.setViewport({
            width: parseInt(options.viewportSize.split('x')[0], 10),
            height: parseInt(options.viewportSize.split('x')[1], 10),
            deviceScaleFactor: 1,
        });
        log(`Launched the ${await browser.version()} browser.`);

        const products = [
            {
                product: "hp-elitedesk-800-65w-g4-desktop-mini-pc",
                url: "https://support.hp.com/us-en/drivers/selfservice/hp-elitedesk-800-65w-g4-desktop-mini-pc/21353734",
            },
            {
                product: "hp-elitedesk-800-35w-g2-desktop-mini-pc",
                url: "https://support.hp.com/us-en/drivers/selfservice/hp-elitedesk-800-35w-g2-desktop-mini-pc/7633266",
            },
        ]

        for (const p of products) {
            const product = p.product;
            const url = p.url;
            try {
                const scrapePath = `data/${product}.json`;

                log(`Scraping ${product}...`);
                const data = await getDrivers(page, url);

                log(`Saving to ${scrapePath}...`);
                fs.mkdirSync(path.dirname(scrapePath), {recursive: true});
                fs.writeFileSync(scrapePath, JSON.stringify(data, null, 4));
            } finally {
                log("Taking a screenshot...");
                await page.screenshot({ path: `${product}.png`, fullPage: true });
            }
        }
    } finally {
        await browser.close();
    }
}

program
    .option('--viewport-size <size>', 'browser viewport size', '1280x720')
    .option('--debug', 'run the browser in foreground', false)
    .parse(process.argv);

await main(program.opts());
