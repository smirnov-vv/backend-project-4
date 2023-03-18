import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const { promises: fsp } = fs;

const downloadFilesFromSite = (tag, attr, arrayForNames, commonParams, $, config = {}) => {
  const [providedURL, optimizedHostName, dirForAssets] = commonParams;
  const responses = [];
  $(tag).each((_, e) => {
    const originalLink = $(e).attr(attr)?.startsWith('.') ? $(e).attr(attr).slice(1) : $(e).attr(attr);
    const originalURL = new URL(originalLink, providedURL.origin);
    const optimizedFileName = originalURL.pathname.replace(/[^a-zA-Z0-9.]/g, '-');
    const fileName = originalLink?.includes('.')
      ? `${optimizedHostName}${optimizedFileName}`
      : `${optimizedHostName}${optimizedFileName}.html`;
    const newLink = originalURL.origin === providedURL.origin ? `${dirForAssets}/${fileName}` : originalLink;
    if (originalURL.origin === providedURL.origin && originalLink !== undefined) {
      arrayForNames.push(fileName);
      responses.push(axios.get(originalURL, config)
        .then((response) => response)
        .catch((err) => ({ result: 'downloading file failed', error: err })));
    }
    $(e).attr(attr, newLink);
  });
  return Promise.all(responses);
};

const saveFilesLocally = (respnosesToResourceRequest, pathToAssets, fileNames) => {
  const promises = respnosesToResourceRequest.map((res, index) => {
    const PathToImg = path.join(pathToAssets, fileNames[index]);
    return fsp.writeFile(PathToImg, res.data);
  });
  return Promise.all(promises);
};

export default (url, outputPath) => {
  const providedURL = new URL(url);
  const { hostname, pathname } = providedURL;
  const preName = pathname.length > 1 ? `${hostname}${pathname}` : hostname;
  const optimizedHostName = hostname.replace(/[^a-zA-Z0-9]/g, '-');
  const optimizedName = preName.replace(/[^a-zA-Z0-9]/g, '-');
  const mainFileName = `${optimizedName}.html`;
  const dirForAssets = `${optimizedName}_files`;
  const pathToMainfile = path.join(outputPath, mainFileName);
  const pathToAssets = path.join(outputPath, dirForAssets);
  const imgNames = [];
  const resourceNames = [];
  const scriptNames = [];
  const commonParams = [providedURL, optimizedHostName, dirForAssets];
  let $;
  return fsp.mkdir(pathToAssets, { recursive: true })
    .then(() => axios.get(url))
    .then((res) => {
      $ = cheerio.load(res.data);
      return downloadFilesFromSite('img', 'src', imgNames, commonParams, $, { responseType: 'arraybuffer' });
    })
    .then((data) => saveFilesLocally(data, pathToAssets, imgNames))
    .then(() => downloadFilesFromSite('link', 'href', resourceNames, commonParams, $))
    .then((data) => saveFilesLocally(data, pathToAssets, resourceNames))
    .then(() => downloadFilesFromSite('script', 'src', scriptNames, commonParams, $))
    .then((data) => saveFilesLocally(data, pathToAssets, scriptNames))
    .then(() => fsp.writeFile(pathToMainfile, $.html()))
    .then(() => {
      console.log(pathToMainfile);
      return pathToMainfile;
    })
    .catch((error) => {
      console.log('Mission failed');
      throw error;
    });
};
