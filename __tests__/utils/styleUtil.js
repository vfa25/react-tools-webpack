const { cssInjection } = require('../../lib/utils/styleUtil');

describe('styleUtil', () => {
  it('cssInjection', () => {
    const libContent = `
    "use strict";
    require("../../style/index.less");
    require("./index.less");

    require("../../button/style");
    `.trim();
    const esContent = `
    require("../../style/index.less");
    require("./index.less");

    require("../../button/style");
    `.trim();
    
    expect(cssInjection(libContent)).toEqual(`
    "use strict";
    require("../../style/index.css");
    require("./index.css");

    require("../../button/style/css");
    `.trim());
    expect(cssInjection(esContent)).toEqual(`
    require("../../style/index.css");
    require("./index.css");

    require("../../button/style/css");
    `.trim());
  });
});
