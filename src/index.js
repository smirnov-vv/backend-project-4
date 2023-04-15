import axios from 'axios';
import debug from 'debug';
import axiosDebug from 'axios-debug-log';
import Listr from 'listr';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const { promises: fsp } = fs;

const debugLogger = debug('page-loader');
const axiosLogger = debug('axios');
axiosDebug.addLogger(axios, axiosLogger);

const downloadFilesFromSite = (tag, attr, arrayForNames, commonParams, $, config = {}) => {
  const [providedURL, optimizedHostName, dirForAssets] = commonParams;
  const responses = [];
  const linkNames = [];
  $(tag).each((_, e) => {
    const originalLink = $(e).attr(attr)?.startsWith('.') ? $(e).attr(attr).slice(1) : $(e).attr(attr);
    debugLogger(`Original resource: ${originalLink} %s`);
    const originalURL = new URL(originalLink, providedURL.origin);
    const optimizedFileName = originalURL.pathname.replace(/[^a-zA-Z0-9.]/g, '-');
    const fileName = originalLink?.includes('.')
      ? `${optimizedHostName}${optimizedFileName}`
      : `${optimizedHostName}${optimizedFileName}.html`;
    const newLink = originalURL.origin === providedURL.origin ? `${dirForAssets}/${fileName}` : originalLink;
    if (originalURL.origin === providedURL.origin && originalLink !== undefined) {
      arrayForNames.push(fileName);
      linkNames.push(originalURL);
      responses.push(axios.get(originalURL, config)
        .then((response) => response)
        .catch((err) => ({ result: `Failed to download '${originalURL}'`, error: err })));
    }
    $(e).attr(attr, newLink);
  });
  const tasksArray = responses.map((promise, index) => ({ title: ` ${linkNames[index]}`, task: () => promise }));
  const tasks = new Listr(tasksArray, { concurrent: true });
  tasks.run();
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
  debugLogger('Booting %s', `page-loader with ${outputPath} ${url}`);
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
    .then(() => downloadFilesFromSite('link', 'href', resourceNames, commonParams, $, { responseType: 'arraybuffer' }))
    .then((data) => saveFilesLocally(data, pathToAssets, resourceNames))
    .then(() => downloadFilesFromSite('script', 'src', scriptNames, commonParams, $, { responseType: 'arraybuffer' }))
    .then((data) => saveFilesLocally(data, pathToAssets, scriptNames))
    .then(() => fsp.writeFile(pathToMainfile, $.html()))
    .then(() => {
      console.log(`Page was successfully downloaded into '${pathToMainfile}'`);
      return pathToMainfile;
    });
};
