const makeFederation = require('@iobroker/vis-2-widgets-react-dev/modulefederation.config');

module.exports = makeFederation(
    'vis2trashmasterWidgets', // internal name of package - must be unique and identical with io-package.json=>common.visWidgets.vis2trashmasterWidget
    {
        './TrashIcon': './src/TrashIcon', // List of all widgets in this package
        './TrashTable': './src/TrashTable', // List of all widgets in this package
        './translations': './src/translations',
    },
);
