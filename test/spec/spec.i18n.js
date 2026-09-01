import i18n from '../../index.js';

describe('i18n-future', function () {

    it('exports a function', function () {
        i18n.should.be.a('function');
    });

    it('returns a translator instance', function () {
        i18n().should.be.an.instanceOf(i18n.Translator);
    });

});
