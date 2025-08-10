const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = {
    entry: './src/index.tsx', // Entry file
    output: {
        filename: 'bundle.js', // Output file
        path: path.resolve(__dirname, 'dist'), // Output directory
    },
    devtool: 'inline-source-map', // Generate source map
    module: {
        rules: [
            {
                test: /\.(js|jsx|)$/, // Match .js, .jsx files
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader', // Use babel-loader
                },
            },
            {
                test: /\.(ts|tsx)$/, // Match .ts, .tsx files
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader', // Use ts-loader
                    options: {
                        transpileOnly: true,
                    }
                },
            },
            {
                test: /\.css$/, // Match .css files
                use: ['style-loader', 'css-loader'], // Use CSS Loader and Style Loader
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './public/index.html', // Use HTML template file
        }),
        new CleanWebpackPlugin(), // Clean output directory
        new ForkTsCheckerWebpackPlugin(),
    ],
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'], // Support omitting file extensions when importing
    },
    devServer: {
        static: './dist', // Dev server static files root
        port: 3000, // Specify port
        hot: true, // Enable Hot Module Replacement (HMR)
    },
};
