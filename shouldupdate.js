"use strict";

var filter  = require('lodash.pick'),
    isEqual = require('lodash.isequal');

/**
 * Directly fetch `shouldComponentUpdate` mixin to use outside of Omniscient.
 * You can do this if you don't want to use Omniscients syntactic sugar.
 *
 * @param {Object} nextProps Next props. Can be objects of cursors, values or immutable structures
 * @param {Object} nextState Next state. Can be objects of values or immutable structures
 *
 * @property {Function} isEqualState Get default isEqualState
 * @property {Function} isEqualProps Get default isEqualProps
 * @property {Function} debug Get default debug
 *
 * @module shouldComponentUpdate
 * @returns {Component}
 * @api public
 */
module.exports = factory();

/**
 * Create a “local” instance of the shouldComponentUpdate with overriden defaults.
 *
 * ### Options
 * ```js
 * {
 *   isEqualState: function (currentState, nextState), // check state
 *   isEqualProps: function (currentProps, nextProps), // check props
 * }
 * ```
 *
 * @param {Object} [Options] Options with defaults to override
 *
 * @module shouldComponentUpdate.withDefaults
 * @returns {Function} shouldComponentUpdate with overriden defaults
 * @api public
 */
module.exports.withDefaults = factory;

function factory (methods) {
  var debug;
  methods = methods || {};

  var _isEqualState  = methods.isEqualState || isEqualState,
      _isEqualProps  = methods.isEqualProps || isEqualProps;

  shouldComponentUpdate.isEqualState = _isEqualState;
  shouldComponentUpdate.isEqualProps = _isEqualProps;
  shouldComponentUpdate.debug = debugFn;

  return shouldComponentUpdate;

  function shouldComponentUpdate (nextProps, nextState) {
    var currentProps;

    if (nextProps === this.props && nextState === this.state) {
      if (debug) debug.call(this, 'shouldComponentUpdate => false (equal input)');
      return false;
    }

    if (!_isEqualState(this.state, nextState)) {
      if (debug) debug.call(this, 'shouldComponentUpdate => true (state has changed)');
      return true;
    }

    nextProps    = filter(nextProps, isNotChildren);
    currentProps = filter(this.props, isNotChildren);

    if (!_isEqualProps(currentProps, nextProps)) {
      if (debug) debug.call(this, 'shouldComponentUpdate => true (props have changed)');
      return true;
    }

    if (debug) debug.call(this, 'shouldComponentUpdate => false');

    return false;
  }

  /**
   * Predicate to check if props are equal. Checks in the tree for cursors and immutable structures
   * and if it is, check by reference.
   *
   * Override through `shouldComponentUpdate.withDefaults`.
   *
   * @param {Object} value
   * @param {Object} other
   *
   * @module shouldComponentUpdate.isEqualProps
   * @returns {Boolean}
   * @api public
   */
  function isEqualProps (value, other) {
    if (compare(value, other)) return true;
    return isEqual(value, other, compare);
  }

  /**
   * Predicate to check if state is equal. Checks in the tree for immutable structures
   * and if it is, check by reference. Does not support cursors.
   *
   * Override through `shouldComponentUpdate.withDefaults`.
   *
   * @param {Object} value
   * @param {Object} other
   *
   * @module shouldComponentUpdate.isEqualState
   * @returns {Boolean}
   * @api public
   */
  function isEqualState (value, other) {
    return isEqualProps(value, other);
  }

  function debugFn (pattern, logFn) {
    if (typeof pattern === 'function') {
      logFn   = pattern;
      pattern = void 0;
    }

    var logger = logFn;
    if (!logger && console.debug) {
      logger = console.debug.bind(console);
    }
    if (!logger && console.info) {
      logger = console.info.bind(console);
    }

    var regex = new RegExp(pattern || '.*');
    debug = function (str) {
      var element = this._currentElement;
      if (this._reactInternalInstance && this._reactInternalInstance._currentElement) {
        element = this._reactInternalInstance._currentElement;
      }
      var key = element && element.key ? ' key=' + element.key : '';
      var name = this.constructor.displayName;
      if (!key && !name) {
        name = 'Unknown';
      }
      var tag = name + key;
      if (regex.test(tag)) logger('<' + tag + '>: ' + str);
    };
    return debug;
  }
}

function compare (current, next) {
  if (current === next) return true;
  var currentHasValueOf = hasValueOf(current);
  var nextHasValueOf = hasValueOf(next);

  if (currentHasValueOf && nextHasValueOf &&
    current.valueOf() === next.valueOf()) {
    return true;
  }

  var currentHasEquals = hasEquals(current);
  var nextHasEquals = hasEquals(next);

  if (currentHasEquals && nextHasEquals) {
    return current.equals(next);
  }
  if (currentHasEquals || nextHasEquals) {
    return false;
  }
  return void 0;
}

function hasEquals (obj) {
  return !!(obj && typeof obj.equals !== 'undefined');
}

function hasValueOf (obj) {
  return !!(obj && typeof obj.valueOf !== 'undefined');
}

function isStatics (_, key) {
  return key === 'statics';
}

function isNotChildren (_, key) {
  return key !== 'children';
}