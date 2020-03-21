# XML Sitemap to Visual Tree

This parses/converts a public .xml file normally `www.website.com/sitemap.xml` collects all the URLs from it, then generates screenshots using Puppeteer and creates a family tree style hierarchy using GoJs.

## Usage

- `npm install`
- `npm start`
- open `localhost:3000`

## Warning

- This is just a proof of concept, use it however you like.
- Only 1 sitemap can be generated at any one time.

## Hosting

This can run on heroku easy, just make sure you have the nodejs and `heroku buildpacks:add jontewks/puppeteer` buildpack installed.
