const postcss = require('postcss');

const selector = require('postcss-selector-parser');

const processVariationAtRule = (transformRules, atRule) => {
    let baseRule = atRule.parent.clone();

    baseRule.source = atRule.source;

    if (baseRule.type !== 'rule') {
        throw atRule.error(`@${atRule.name} must be in rule scope`);
    }

    let atRuleParams = postcss.list.comma(atRule.params);

    let variationName = atRuleParams[0];

    if (!variationName) {
        throw atRule.error(`@${atRule.name} must specify variation`);
    }

    let variationParams = atRuleParams.slice(1);

    baseRule.each((baseNode) => {
        if (baseNode.type === 'atrule' && baseNode.name === atRule.name) {
            baseNode.remove();
        }
    });

    let outRules = transformRules.call(
        baseRule,
        variationName,
        variationParams
    );

    atRule.remove();

    return outRules;
};

const processVariationAtRules = (transformRules, container) => {
    container.walkRules((rule) => {
        let outRules = [];

        rule.walkAtRules('variation', (atRule) => {
            outRules.push(...processVariationAtRule(transformRules, atRule));
        });

        rule.after(outRules);
    });
};

const indentTree = (node, height = 0, padding = '    ') => {
    node.raws.after = `\n${padding.repeat(height)}`;
    node.raws.before = `\n${padding.repeat(height)}`;

    if (node.each) {
        node.each((nodeChild) => {
            indentTree(nodeChild, height + 1, padding);
        });
    }
};

class StateVariation {
    constructor(sep, stateName, stateValue) {
        this.sep = sep;
        this.stateName = stateName;
        this.stateValue = stateValue;
    }

    call(outRule, variationParams) {
        let outSelector = selector().astSync(outRule.selector);

        outSelector.each((container) => {
            container.first.value += `${this.sep}${this.stateName}`;

            container.append(
                selector.pseudo({ value: `:${this.stateValue}` })
            );
        });

        outRule.selector = outSelector.toString();

        indentTree(outRule);

        return [outRule];
    }
}

class MediaVariation {
    constructor(sep, mediaName, mediaValue) {
        this.sep = sep;
        this.mediaName = mediaName;
        this.mediaValue = mediaValue;
    }

    call(outRule, variationParams) {
        let outSelector = selector().astSync(outRule.selector);

        outSelector.each((container) => {
            container.first.value += `${this.sep}${this.mediaName}`;
        });

        outRule.selector = outSelector.toString();

        let mediaRule = postcss.atRule({
            name: 'media',
            params: this.mediaValue,
        });

        mediaRule.source = outRule.source;

        mediaRule.append(outRule);

        indentTree(mediaRule);

        return [mediaRule];
    }
}

class BuildVariationMap {
    constructor(
        sep,
        stateMap,
        mediaMap,
        stateVariationClass,
        mediaVariationClass
    ) {
        this.sep = sep;
        this.stateMap = new Map(Object.entries(stateMap));
        this.mediaMap = new Map(Object.entries(mediaMap));
        this.stateVariationClass = stateVariationClass;
        this.mediaVariationClass = mediaVariationClass;
    }

    call(map) {
        this.stateMap.forEach((stateValue, stateName) => {
            map.set(
                stateName,
                new this.stateVariationClass(this.sep, stateName, stateValue)
            );
        });

        this.mediaMap.forEach((mediaValue, mediaName) => {
            map.set(
                mediaName,
                new this.mediaVariationClass(this.sep, mediaName, mediaValue)
            );
        });

        return map;
    }
}

class TransformRules {
    constructor(variationMap) {
        this.variationMap = variationMap;
    }

    call(baseRule, variationName, variationParams) {
        if (!this.variationMap.has(variationName)) {
            throw atRule.error(`undefined variation: ${variationName}`);
        }

        let variation = this.variationMap.get(variationName);

        return variation.call(baseRule, variationParams);
    }
}

module.exports = postcss.plugin(
    'postcss-plugin-custom-variations',
    (opts = {}) => {
        const defaultOpts = {
            sep: '@',
            stateMap: {
                hover: 'hover',
                focus: 'focus',
                active: 'active',
            },
            mediaMap: {
                'screen-xs': 'screen and (min-width: 20em)',
                'screen-sm': 'screen and (min-width: 40em)',
                'screen-md': 'screen and (min-width: 48em)',
                'screen-lg': 'screen and (min-width: 64em)',
                'screen-xl': 'screen and (min-width: 80em)',
            },
            stateVariationClass: StateVariation,
            mediaVariationClass: MediaVariation,
            buildVariationMapClass: BuildVariationMap,
            transformRulesClass: TransformRules,
        };

        opts = { ...defaultOpts, ...opts };

        let buildVariationMap = new opts.buildVariationMapClass(
            opts.sep,
            opts.stateMap,
            opts.mediaMap,
            opts.stateVariationClass,
            opts.mediaVariationClass
        );

        let variationMap = buildVariationMap.call(new Map());

        let transformRules = new opts.transformRulesClass(variationMap);

        return (root, result) => {
            processVariationAtRules(transformRules, root);
        };
    }
);

module.exports.StateVariation = StateVariation;

module.exports.MediaVariation = MediaVariation;

module.exports.BuildVariationMap = BuildVariationMap;

module.exports.TransformRules = TransformRules;
