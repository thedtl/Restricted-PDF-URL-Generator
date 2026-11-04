const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// Exercise the published page's formatter and generated links without a PDF or API.
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const source = html.slice(html.indexOf('        const VIEWER_URL'), html.lastIndexOf('</script>'));
function page() {
    const fields = {};
    const document = {
        addEventListener() {}, querySelectorAll() { return []; },
        createElement() {
            return { innerHTML: '', get textContent() { return this.innerHTML.replace(/<[^>]*>/g, ''); } };
        },
        getElementById(id) {
            return fields[id] ||= {
                value: '', textContent: '', style: {}, dataset: {},
                checked: id === 'downloadCheckbox' && /id="downloadCheckbox"[^>]*\bchecked\b/.test(html),
                addEventListener() {}, focus() {}, classList: { remove() {} }
            };
        }
    };
    const context = vm.createContext({
        document, pdfjsLib: { GlobalWorkerOptions: {} }, URLSearchParams,
        btoa: text => Buffer.from(text, 'binary').toString('base64'),
        console, clearTimeout() {}, setTimeout() {},
        fetch() { throw new Error('No network permitted in this check'); }
    });
    vm.runInContext(source, context);
    return { context, field: id => document.getElementById(id) };
}

const citation = 'Smith, Alex. A Book: Its Subtitle. 3rd ed. Example Series, vol. 40B. New York: Example Press, 2020.';

test('Short Display contains only title/subtitle while citation details remain in footnote', () => {
    const { context: c } = page();
    const result = c.buildCitationVariantsFromBibliography(citation);
    assert.equal(result.short, 'A Book: Its Subtitle');
    for (const detail of ['Alex Smith', '3rd ed.', 'Example Series', '40B', 'New York', 'Example Press', '2020']) {
        assert.ok(result.footnote.includes(detail), result.footnote);
    }
    assert.equal(c.buildCitationVariantsFromBibliography('Moore, Carey A. Esther. The Anchor Bible.').short, 'Esther');
    assert.equal(c.buildCitationVariantsFromBibliography('Smith, Alex. 1984 and Its Readers. London: Example Press, 2000.').short, '1984 and Its Readers');
    assert.equal(c.buildCitationVariantsFromBibliography('Smith, Alex. A History, Volume 2. London: Example Press, 2000.').short, 'A History, Volume 2');
});

test('missing title never falls back to a complete citation or a parsed publication imprint', () => {
    const { context: c } = page();
    assert.equal(c.buildCitationVariantsFromBibliography('').short, '');
    assert.equal(c.buildCitationVariantsFromBibliography('Citation needed').short, '');
    assert.equal(c.buildCitationVariantsFromBibliography('A Book: Its Subtitle. New York: Example Press, 2020.').short, '');
});

test('manual short display and footnote edits remain untouched', () => {
    const { context: c, field } = page();
    field('shortCitation').value = 'My custom display';
    field('footnoteCitation').value = 'My custom footnote';
    c.fillDerivedCitationFields(citation);
    assert.equal(field('shortCitation').value, 'My custom display');
    assert.equal(field('footnoteCitation').value, 'My custom footnote');
});

test('new and cleared forms allow downloads; explicit opt-out still reaches all generated links', async () => {
    const { context: c, field } = page();
    assert.equal(field('downloadCheckbox').checked, true);
    for (const allowed of [true, false]) {
        field('dropboxLink').value = 'https://www.dropbox.com/s/example/book.pdf?dl=0';
        field('citation').value = citation;
        field('downloadCheckbox').checked = allowed;
        await c.generateLink();
        const url = field('finalLink').textContent;
        assert.equal(new URL(url).searchParams.get('download'), String(allowed));
        assert.ok(field('embedCode').textContent.includes(url));
        assert.ok(field('accordionCode').textContent.includes(url));
        assert.equal(field('shortCitation').value, 'A Book: Its Subtitle');
        assert.ok(field('citation').value.includes('Example Press'));
    }
    c.clearForm();
    assert.equal(field('downloadCheckbox').checked, true);
    assert.equal(field('shortCitation').value, '');
});
