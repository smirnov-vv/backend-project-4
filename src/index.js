import axios from 'axios';
import fs from 'fs';
import path from 'path';

const { promises: fsp } = fs;

export default (url, outputPath) => {
  console.log(`you entered\nurl: ${url}\npath to save: ${outputPath}`);
  let pathToFile;
  return axios.get(url)
    .then((response) => {
      const myURL = new URL(url);
      const hostName = myURL.hostname;
      const pathName = myURL.pathname;
      const preFileName = pathName.length > 1 ? `${hostName}${pathName}` : hostName;
      const optimizedName = preFileName.replace(/[^a-zA-Z0-9]/g, '-');
      const fileName = `${optimizedName}.html`;
      pathToFile = path.join(outputPath, fileName);
      console.log(`filename: ${fileName}`);
      return fsp.writeFile(pathToFile, response.data);
    })
    .then(() => pathToFile)
    .catch((error) => {
      console.log(error.code);
      console.log(error.config);
      console.log('------------RESPONSE---------------');
      console.log(error.response.status);
      console.log(error.response.statusText);
      console.log(error.response.headers);
      throw error;
    });
};
