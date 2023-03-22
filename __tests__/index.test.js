import fs from 'fs';
import nock from 'nock';
import os from 'os';
import { fileURLToPath } from 'url';
import path from 'path';
import pageloader from '../src/index.js';

const { promises: fsp } = fs;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFixturePath = (filename) => path.join(__dirname, '..', '__fixtures__', filename);
const readFile = (filename) => fsp.readFile(getFixturePath(filename), 'utf-8');

let tempPath;
const url1 = 'https://ru.hexlet.io/courses';
const fileName = 'ru-hexlet-io-courses.html';

beforeEach(async () => {
  tempPath = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('return full path', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200);
  const result = await pageloader(url1, tempPath);
  const fullPathToHTML = path.join(tempPath, fileName);
  expect(result).toEqual(fullPathToHTML);
});

test('downloaded files are as expected', async () => {
  const expectedBody = await readFile('before.html');
  const expectedMainFile = await readFile('after.html');
  const expectedImg = await readFile('nodejs.png');
  const expectedCSS = await readFile('application.css');
  const expectedScript = await readFile('runtime.js');
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, expectedBody)
    .get(/\/courses/)
    .reply(200)
    .get(/\/assets\/professions\/nodejs.png/)
    .replyWithFile(200, getFixturePath('nodejs.png'), {
      'Content-Type': 'image/png',
    })
    .get(/\/assets\/application.css/)
    .replyWithFile(200, getFixturePath('application.css'), {
      'Content-Type': 'text/css',
    })
    .get(/\/packs\/js\/runtime.js/)
    .replyWithFile(200, getFixturePath('runtime.js'), {
      'Content-Type': 'application/x-javascript',
    });
  await pageloader(url1, tempPath);
  const pathToHTML = path.join(tempPath, fileName);
  const actualHTML = await fsp.readFile(pathToHTML, { encoding: 'utf8' });
  expect(actualHTML).toEqual(expectedMainFile);

  const pathToImg = path.join(tempPath, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-professions-nodejs.png');
  const actualImg = await fsp.readFile(pathToImg, { encoding: 'utf8' });
  expect(actualImg).toEqual(expectedImg);

  const pathToCSS = path.join(tempPath, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-application.css');
  const actualCSS = await fsp.readFile(pathToCSS, { encoding: 'utf8' });
  expect(actualCSS).toEqual(expectedCSS);

  const pathToScript = path.join(tempPath, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-packs-js-runtime.js');
  const actualScript = await fsp.readFile(pathToScript, { encoding: 'utf8' });
  expect(actualScript).toEqual(expectedScript);
});

test('failed to access provided URL', async () => {
  nock(/doesnt\.exist/)
    .get(/\//)
    .reply(404);
  const url2 = 'https://doesnt.exist';
  await expect(() => pageloader(url2, tempPath)).rejects.toThrow('Request failed with status code 404');
});

test('server response with 500 error', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(500);
  await expect(() => pageloader(url1, tempPath)).rejects.toThrow('Request failed with status code 500');
});

test('failed to write file: permission denied', async () => {
  const expectedBody = await readFile('before.html');
  const img = await readFile('nodejs.png');
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, expectedBody)
    .get(/\/assets\/professions\/nodejs.png/)
    .replyWithFile(200, getFixturePath('nodejs.png'), {
      'Content-Type': 'image/png',
    });
  const dirForAssets = path.join(tempPath, 'ru-hexlet-io-courses_files');
  await fsp.mkdir(dirForAssets, { recursive: true });
  const pathToImg = path.join(dirForAssets, 'ru-hexlet-io-assets-professions-nodejs.png');
  await fsp.writeFile(pathToImg, img);
  await fsp.chmod(pathToImg, 0o400);
  await expect(() => pageloader(url1, tempPath)).rejects.toThrow(/EACCES: permission denied, open/);
});

test('failed to make dir: permission denied', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200);
  await expect(() => pageloader(url1, '/sys')).rejects.toThrow('EACCES: permission denied, mkdir \'/sys/ru-hexlet-io-courses_files\'');
});
