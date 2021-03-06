/*
 * Copyright (c) Enalean, 2019-Present. All Rights Reserved.
 *
 * This file is a part of Tuleap Documentation.
 *
 * Tuleap Documentation is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * Tuleap Documentation is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Tuleap Documentation. If not, see <http://www.gnu.org/licenses/>.
 */

const { merge } = require("webpack-merge");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = merge(require("./webpack.common.js"), {
    mode: "production",
    plugins: [
        new CssMinimizerPlugin({
            minimizerOptions: {
                preset: [
                    "default",
                    {
                        discardComments: {
                            removeAll: true
                        }
                    }
                ]
            }
        })
    ],
    stats: {
        all: false,
        chunks: true,
        assets: true,
        errors: true,
        errorDetails: true,
        performance: true,
        timings: true
    },
    optimization: {
        removeEmptyChunks: true,
    },
});