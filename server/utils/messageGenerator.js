const messageTemplates = require("./messageTemplates.json");

const formatMessage = (template, variables) => {
  return template.replace(/\{(\w+)\}/g, (_, variable) => variables[variable]);
};

const generateMessage = (templateName, variables) => {
  const template = messageTemplates[templateName];
  return formatMessage(template, variables);
};

module.exports = generateMessage;
