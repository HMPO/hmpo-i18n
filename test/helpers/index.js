import { should, use, expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

should();
use(sinonChai);

global.sinon = sinon;
global.expect = expect;
