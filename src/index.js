import axios from 'axios';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const { promises: fsp } = fs;

export default (url, outputPath) => {
  const myURL = new URL(url);
  const { protocol } = myURL;
  const hostName = myURL.hostname;
  const pathName = myURL.pathname;
  const preName = pathName.length > 1 ? `${hostName}${pathName}` : hostName;
  const optimizedName = preName.replace(/[^a-zA-Z0-9]/g, '-');
  const mainFileName = `${optimizedName}.html`;
  const dirForAssets = `${optimizedName}_files`;
  const pathToMainfile = path.join(outputPath, mainFileName);
  const pathToAssets = path.join(outputPath, dirForAssets);
  const imgNames = [];
  let html;
  return fsp.mkdir(pathToAssets, { recursive: true })
    .then(() => axios.get(url))
    .then((res) => {
      const responsesToImgDownload = [];
      const config = { responseType: 'arraybuffer' };
      const $ = cheerio.load(res.data);
      $('img').each((_, e) => {
        const originalSrc = $(e).attr('src');
        const originalAddressToImg = `${protocol}//${hostName}/${originalSrc}`;
        const optimizedImgName = originalSrc.replace(/[^a-zA-Z0-9.]/g, '-');
        const optimizedHostName = hostName.replace(/[^a-zA-Z0-9]/g, '-');
        const imgName = `${optimizedHostName}${optimizedImgName}`;
        imgNames.push(imgName);
        $(e).attr('src', `${dirForAssets}/${imgName}`);
        responsesToImgDownload.push(axios.get(originalAddressToImg, config)
          .then((response) => response)
          .catch((err) => ({ result: 'downloading images failed', error: err })));
        // console.log(_, e.name, $(e).attr('src'));
      });
      html = $.html();
      return Promise.all(responsesToImgDownload);
    })
    .then((responsesToImgDownload) => {
      const promises = responsesToImgDownload.map((res, index) => {
        const PathToImg = path.join(pathToAssets, imgNames[index]);
        return fsp.writeFile(PathToImg, res.data);
      });
      return Promise.all(promises);
    })
    .then(() => fsp.writeFile(pathToMainfile, html))
    .then(() => {
      console.log('Mission complete');
      return pathToMainfile;
    })
    .catch((error) => {
      console.log('Mission failed');
      throw error;
    });
};
