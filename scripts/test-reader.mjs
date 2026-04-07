import { createReader } from '@keystatic/core/reader';
import config from '../keystatic.config.ts';
import Markdoc from '@markdoc/markdoc';

const reader = createReader(process.cwd(), config);

const page = await reader.singletons.ateliersReguliers.read();
console.log('Page:', JSON.stringify(page, (key, val) => typeof val === 'function' ? '[Function]' : val, 2));

if (page?.content) {
  const contentResult = await page.content();
  console.log('\nContent result type:', typeof contentResult);
  console.log('Content result keys:', Object.keys(contentResult));

  // Try rendering
  const html = Markdoc.renderers.html(contentResult.node);
  console.log('\nRendered HTML (first 500 chars):');
  console.log(html.slice(0, 500));
}
