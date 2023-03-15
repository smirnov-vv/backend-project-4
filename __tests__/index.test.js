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
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, expectedBody)
    .get(/\/assets\/professions\//)
    .replyWithFile(200, getFixturePath('nodejs.png'), {
      'Content-Type': 'image/png',
    });
  await pageloader(url1, tempPath);
  const pathToHTML = path.join(tempPath, fileName);
  const actualHTML = await fsp.readFile(pathToHTML, { encoding: 'utf8' });
  expect(actualHTML).toEqual(expectedMainFile);
  const pathToImg = path.join(tempPath, 'ru-hexlet-io-courses_files', 'ru-hexlet-io-assets-professions-nodejs.png');
  const actualImg = await fsp.readFile(pathToImg, { encoding: 'utf8' });
  expect(actualImg).toEqual(expectedImg);
});

test('non-existent web-site', async () => {
  nock(/doesnt\.exist/)
    .get(/\//)
    .reply(404);
  const url2 = 'https://doesnt.exist';
  await expect(pageloader(url2, tempPath)).rejects.toThrow(Error);
});
