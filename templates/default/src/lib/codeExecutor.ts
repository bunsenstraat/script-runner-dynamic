import { createClient } from '@remixproject/plugin-iframe'
import { PluginClient } from '@remixproject/plugin'
import { TranspileOutput } from "typescript"
import * as path from 'path'
import './runWithMocha'
import * as web3Js from 'web3'

const scriptReturns:  { [key: string]: any } = {} // keep track of modules exported values
const fileContents: { [key: string]: any } = {} // keep track of file content
declare global {
  interface Window {
    [key: string]: any;
    require: any
  }
}

const testweb3Provider = {
    sendAsync(payload: any, callback: any) {
        window.remix.call('web3Provider', 'sendAsync', payload)
            .then((result: any) => callback(null, result))
            .catch((e: any) => callback(e))
    }
}

window.require = (module: string) => {
    console.log('window.require', module)
    console.log(scriptReturns, fileContents)
    if (module === 'web3') {
        console.log('web3Js', web3Js)
        const testclass = new web3Js.default(testweb3Provider)
        console.log('testclass', testclass)
        return web3Js.default
    }
    if (window[module]) return window[module] // library
    if (window['_' + module]) return window['_' + module] // library
    else if ((module.endsWith('.json') || module.endsWith('.abi')) && window.__execPath__ && fileContents[window.__execPath__]) return JSON.parse(fileContents[window.__execPath__][module])
    else if (window.__execPath__ && scriptReturns[window.__execPath__]) return scriptReturns[window.__execPath__][module] // module exported values
    else throw new Error(`${module} module require is not supported by Remix IDE`)
}

class CodeExecutor extends PluginClient {
  async execute(script: string, filePath: string) {
    filePath = filePath || 'scripts/script.ts'
    const paths = filePath.split('/')
    paths.pop()
    const fromPath = paths.join('/') // get current execcution context path
    if (script) {
      try {
        const ts = await import('typescript');
        const transpiled: TranspileOutput = ts.transpileModule(script, {
          moduleName: filePath, fileName: filePath,
          compilerOptions: {
            target: ts.ScriptTarget.ES2015,
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          }
        });
        script = transpiled.outputText;
        console.log('transpiled', transpiled.outputText)
        // extract all the "require", execute them and store the returned values.
        const regexp = /require\((.*?)\)/g
        const array = [...script.matchAll(regexp)];

        for (const regex of array) {
          let file = regex[1]
          file = file.slice(0, -1).slice(1) // remove " and '
          let absolutePath = file
          if (file.startsWith('./') || file.startsWith('../')) {
            absolutePath = path.resolve(fromPath, file)
          }
          if (!scriptReturns[fromPath]) scriptReturns[fromPath] = {}
          if (!fileContents[fromPath]) fileContents[fromPath] = {}
          const { returns, content } = await this.executeFile(absolutePath)
          scriptReturns[fromPath][file] = returns
          fileContents[fromPath][file] = content
        }

        // execute the script
        script = `const exports = {};
                  const module = { exports: {} }
                  window.__execPath__ = "${fromPath}"
                  ${script};
                  return exports || module.exports`
        console.log('script', script, scriptReturns, fileContents)
        const returns = (new Function(script))()
        console.log('returns', returns, scriptReturns, fileContents)
        if (mocha.suite && ((mocha.suite.suites && mocha.suite.suites.length) || (mocha.suite.tests && mocha.suite.tests.length))) {
          console.log(`RUNS ${filePath}....`)
          mocha.run()
        }
        return returns
      } catch (e: any) {
        console.error('error', {
          data: [e.message]
        })
      }
    }
  }

  async _resolveFile(fileName: string) {
    if (await this.call('fileManager' as any, 'exists', fileName)) return await this.call('fileManager', 'readFile', fileName)
    if (await this.call('fileManager' as any, 'exists', fileName + '.ts')) return await this.call('fileManager', 'readFile', fileName + '.ts')
    if (await this.call('fileManager' as any, 'exists', fileName + '.js')) return await this.call('fileManager', 'readFile', fileName + '.js')
  }

  async executeFile(fileName: string) {
    try {
      if (require(fileName)) return require(fileName)
    } catch (e) { }
    const content = await this._resolveFile(fileName) || ''
    const returns = await this.execute(content, fileName)
    return { returns, content }
  }
}

window.remix = new CodeExecutor()
createClient(window.remix)