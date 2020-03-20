const xml2js = require('xml2js');
const axios = require('axios');
const _ = require('lodash');
const asyncForEach = require('async-await-foreach');
const puppeteer = require('puppeteer');
const md5 = require('md5');
const dots = require('dot-notes');
const parseUrl = require('parse-url');
const ltrim = require('ltrim');
const fs = require('fs');

const Parser = xml2js.parseStringPromise;

let url = null;
let sitemaps = [];
let pages = [];
let structure = {};
let username = null;
let password = null;
let response = null;

const model = {
    class: 'go.TreeModel',
    nodeDataArray: [],
};

const http = url => {
    let config = {};

    if (username) {
        config.auth = {
            username,
            password
        }
    }

    return axios.get(url, config);
};

const findSiteMaps = async url => {
    const { data } = await http(url);
    const xml = await Parser(data);

    if (xml.sitemapindex && xml.sitemapindex.sitemap) {
        await asyncForEach(xml.sitemapindex.sitemap, async item => {
            try {
                sitemaps.push(item.loc[0]);
                response(`found ${item.loc[0]}`);
                return await findSiteMaps(item.loc[0]);
            } catch (e) {
                response(e);
            }

            return true;
        });
    }
};

const extractPages = async () => {
    await asyncForEach(sitemaps, async sitemap => {
        response(`fetching pages on: ${sitemap}`);

        const { data } = await http(sitemap);
        const xml = await Parser(data);

        if (xml.urlset && xml.urlset.url) {
            await asyncForEach(xml.urlset.url, async item => {
                if (item.loc[0].toLowerCase().indexOf('pdf') === -1) {
                    response(`adding: ${item.loc[0]}`);
                    pages.push(item.loc[0]);
                }
            });
        }
    });

    pages = _.uniq(pages);
    pages = _.orderBy(pages, i => i);
};

const screenshotPages = async () => {
    const headers = new Map();

    if (username) {
        headers.set(
            'Authorization',
            `Basic ${new Buffer(`${username}:${password}`).toString('base64')}`
        );
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({
        width: 1024,
        height: 720,
    });

    await asyncForEach(pages, async url => {
        response(`screenshotting: ${url}`);
        const filename = md5(url);
        await page.setExtraHTTPHeaders(headers);
        await page.goto(url);
        await page.screenshot({
            path: `./data/${filename}.jpg`,
            type: 'jpeg',
            quality: 50,
        })
    });

    await browser.close();
};

const generateNesting = async () => {
    pages.forEach(item => {
        const url = parseUrl(item).pathname || 'home';
        const parts = url.split('/');
        const page = parts.pop();
        const path = (url === 'home' ? '' : 'home.') + ltrim(url, '/').replace(/\//gi, '.').replace(/-/gi, '_');

        const shape = {
            key: url,
            parent: url === 'home' ? null : (parts.join('/') || 'home'),
            name: page,
            file: `/data/${md5(item)}.jpg`,
        };

        if (!shape.parent) {
            delete shape.parent;
        }

        model.nodeDataArray.push(shape);
    });

    let polyfills = [];

    model.nodeDataArray = model.nodeDataArray.map(page => {
        if (!page.parent) {
            return page;
        }

        const validParent = model.nodeDataArray.find(i => i.key === page.parent);

        if (validParent) {
            return page;
        }

        polyfills.push({
            key: page.parent,
            parent: 'home',
            name: page.parent,
            file: null,
        });

        return page;
    });

    polyfills = _.uniqBy(polyfills, i => i.key);

    model.nodeDataArray = [...model.nodeDataArray, ...polyfills];

    fs.writeFileSync('data/pages.json', goJs());
};

const goJs = () => {
    return JSON.stringify(model, null, 4);
};

const scanner = async (_url, _username, _password, res) => {
    url = _url;
    sitemaps = [url];
    pages = [];
    structure = {};
    model.nodeDataArray = [];
    username = _username;
    password = _password;
    response = res;

    await findSiteMaps(url);
    await extractPages();
    await generateNesting();
    await screenshotPages();
    // openurl.open('https://sitemap.localhost');

    return true;
};

module.exports = scanner;
