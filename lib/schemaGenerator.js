const Joi = require('joi');
const Path = require('path');
const TJS = require('typescript-json-schema');

const Utilities = require('../lib/utilities');

const schemaGenerator = (module.exports = {});

/**
 * schema for schemaGenerator
 *
 */
schemaGenerator.schema = Joi.object({
  filesPattern: Joi.string(),
  tsConfig: Joi.any(),
  symbolPattern: Joi.string()
}).label('SchemaGenerator').optional()

function hasCommonEl(a, b) {
  const intersection = new Set([...a].filter(x => b.has(x)));
  return intersection.size > 0
}

/**
 * generate JSON schema definitions 
 *  
 * @param {Object} generatorSettings 
 * @returns {Object}
 */
schemaGenerator.generate =  async function(generatorSettings) {
  Joi.assert(generatorSettings, schemaGenerator.schema);

  const files = await Utilities.getFilesFromPattern(generatorSettings.filesPattern)
  const settings = {
    required: true,
    include: files,
    excludePrivate: true
  };

  const resolved = files.map(f => Path.resolve(f))
  const includesSet = new Set(resolved)
  const program = TJS.getProgramFromFiles(resolved, generatorSettings.tsConfig.compilerOptions);
  const generator = TJS.buildGenerator(program, settings, files);

  const symbols = generator.getSymbols()
    // this is convention - type for endpoint Response should be named <SpecificName>EndpointResponse
    .filter((s => s.name.includes(generatorSettings.symbolPattern)))
    // includes only declarations for app files
    .filter(s => hasCommonEl(includesSet, new Set(s.symbol.declarations.map(d => d.parent.fileName))))

  return generator.getSchemaForSymbols(symbols.map(s => s.name)).definitions
}