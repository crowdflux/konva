(function() {
    'use strict';
    /**
     * Line constructor.&nbsp; Lines are defined by an array of points and
     *  a tension
     * @constructor
     * @memberof Konva
     * @augments Konva.Shape
     * @param {Object} config
     * @param {Array} config.points Flat array of points coordinates. You should define them as [x1, y1, x2, y2, x3, y3].
     * @param {Number} [config.tension] Higher values will result in a more curvy line.  A value of 0 will result in no interpolation.
     *   The default is 0
     * @param {Boolean} [config.closed] defines whether or not the line shape is closed, creating a polygon or blob
     * @param {Boolean} [config.bezier] if no tension is provided but bezier=true, we draw the line as a bezier using the passed points
     * @@shapeParams
     * @@nodeParams
     * @example
     * var line = new Konva.PolyLine({
     *   x: 100,
     *   y: 50,
     *   points: [73, 70, 340, 23, 450, 60, 500, 20],
     *   stroke: 'red',
     *   tension: 1
     * });
     */
    Konva.PolyLine = function(config) {
      this.___init(config);
    };
  
    Konva.PolyLine.prototype = {
      ___init: function(config) {
        // call super constructor
        Konva.Shape.call(this, config);
        this.className = 'PolyLine';
        this.setInteriors([])
        this.on(
          'pointsChange.konva tensionChange.konva closedChange.konva bezierChange.konva',
          function() {
            this._clearCache('tensionPoints');
          }
        );
        this.sceneFunc(this._sceneFunc);
      },
      _sceneFunc: function(context) {

        var exterior = this.getExterior(),
          interiors = this.getInteriors(),
          closed = this.getClosed();
        
        context.beginPath();
        this._renderLine(context, exterior);
        for (var i = 0; i < interiors.length; i++) {
          this._renderLine(context, interiors[i]);
          context.lineTo(interiors[i][0],interiors[i][1])
          context.moveTo(exterior[exterior.length - 2], exterior[exterior.length - 1])
        }
  
        // closed e.g. polygons and blobs
        if (closed) {
          if(interiors.length > 0) {
            context.lineTo(exterior[0], exterior[1])
          }else {
            context.closePath();
          }
          context.fillStrokeShape(this);
        } else {
          // open e.g. lines and splines
          context.strokeShape(this);
        }
      },

      _renderLine: function(context, points) {
        var length = points.length,
          tension = this.getTension(),
          closed = this.getClosed(),
          bezier = this.getBezier(),
          tp,
          len,
          n;

        if (!length) {
          return;
        }

        context.moveTo(points[0], points[1]);

        // tension
        if (tension !== 0 && length > 4) {
          tp = this.getTensionPoints();
          len = tp.length;
          n = closed ? 0 : 4;

          if (!closed) {
            context.quadraticCurveTo(tp[0], tp[1], tp[2], tp[3]);
          }

          while (n < len - 2) {
            context.bezierCurveTo(
              tp[n++],
              tp[n++],
              tp[n++],
              tp[n++],
              tp[n++],
              tp[n++]
            );
          }

          if (!closed) {
            context.quadraticCurveTo(
              tp[len - 2],
              tp[len - 1],
              points[length - 2],
              points[length - 1]
            );
          }
        } else if (bezier) {
          // no tension but bezier
          n = 2;

          while (n < length) {
            context.bezierCurveTo(
              points[n++],
              points[n++],
              points[n++],
              points[n++],
              points[n++],
              points[n++]
            );
          }
        } else {
          // no tension
          for (n = 2; n < length; n += 2) {
            context.lineTo(points[n], points[n + 1]);
          }
        }
      },

      getTensionPoints: function() {
        return this._getCache('tensionPoints', this._getTensionPoints);
      },
      _getTensionPoints: function() {
        if (this.getClosed()) {
          return this._getTensionPointsClosed();
        } else {
          return Konva.Util._expandPoints(this.getExterior(), this.getTension());
        }
      },
      interior: function() {
        var interiors = this.getInteriors();
        if(arguments.length === 1) {
          return interiors[arguments[0]];
        }else if (arguments.length === 2) {
          interiors[arguments[0]] = arguments[1];
          this.setInteriors(interiors);
          return this;
        }else {
          throw new Error('Unknown operation polyline');
        }
      },
      _getTensionPointsClosed: function() {
        var p = this.getExterior(),
          len = p.length,
          tension = this.getTension(),
          util = Konva.Util,
          firstControlPoints = util._getControlPoints(
            p[len - 2],
            p[len - 1],
            p[0],
            p[1],
            p[2],
            p[3],
            tension
          ),
          lastControlPoints = util._getControlPoints(
            p[len - 4],
            p[len - 3],
            p[len - 2],
            p[len - 1],
            p[0],
            p[1],
            tension
          ),
          middle = Konva.Util._expandPoints(p, tension),
          tp = [firstControlPoints[2], firstControlPoints[3]]
            .concat(middle)
            .concat([
              lastControlPoints[0],
              lastControlPoints[1],
              p[len - 2],
              p[len - 1],
              lastControlPoints[2],
              lastControlPoints[3],
              firstControlPoints[0],
              firstControlPoints[1],
              p[0],
              p[1]
            ]);
  
        return tp;
      },

      getWidth: function() {
        return this.getSelfRect().width;
      },
      getHeight: function() {
        return this.getSelfRect().height;
      },
      // overload size detection
      getSelfRect: function() {
        var points;
        if (this.getTension() !== 0) {
          points = this._getTensionPoints();
        } else {
          points = this.getExterior();
        }
        var minX = points[0];
        var maxX = points[0];
        var minY = points[1];
        var maxY = points[1];
        var x, y;
        for (var i = 0; i < points.length / 2; i++) {
          x = points[i * 2];
          y = points[i * 2 + 1];
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
        return {
          x: Math.round(minX),
          y: Math.round(minY),
          width: Math.round(maxX - minX),
          height: Math.round(maxY - minY)
        };
      }
    };
    Konva.Util.extend(Konva.PolyLine, Konva.Shape);
  
    // add getters setters
    Konva.Factory.addGetterSetter(Konva.PolyLine, 'closed', false);
  
    /**
     * get/set closed flag.  The default is false
     * @name closed
     * @method
     * @memberof Konva.PolyLine.prototype
     * @param {Boolean} closed
     * @returns {Boolean}
     * @example
     * // get closed flag
     * var closed = line.closed();
     *
     * // close the shape
     * line.closed(true);
     *
     * // open the shape
     * line.closed(false);
     */
  
    Konva.Factory.addGetterSetter(Konva.PolyLine, 'bezier', false);
  
    /**
     * get/set bezier flag.  The default is false
     * @name bezier
     * @method
     * @memberof Konva.PolyLine.prototype
     * @param {Boolean} bezier
     * @returns {Boolean}
     * @example
     * // get whether the line is a bezier
     * var isBezier = line.bezier();
     *
     * // set whether the line is a bezier
     * line.bezier(true);
     */
  
    Konva.Factory.addGetterSetter(Konva.PolyLine, 'tension', 0);
  
    /**
     * get/set tension
     * @name tension
     * @method
     * @memberof Konva.PolyLine.prototype
     * @param {Number} Higher values will result in a more curvy line.  A value of 0 will result in no interpolation.
     *   The default is 0
     * @returns {Number}
     * @example
     * // get tension
     * var tension = line.tension();
     *
     * // set tension
     * line.tension(3);
     */
  
    Konva.Factory.addGetterSetter(Konva.PolyLine, 'exterior', []);
    /**
     * get/set exterior array
     * @name exterior
     * @method
     * @memberof Konva.PolyLine.prototype
     * @param {Array} exterior
     * @returns {Array}
     * @example
     * // get exterior points
     * var exterior = line.exterior();
     *
     * // set exterior points
     * line.exterior([10, 20, 30, 40, 50, 60]);
     *
     * // push a new point to exterior
     * line.exterior(line.exterior().concat([70, 80]));
     */
  
    Konva.Factory.addGetterSetter(Konva.PolyLine, 'interiors', []);
    /**
     * get/set interior 2d array
     * @name interior
     * @method
     * @memberof Konva.PolyLine.prototype
     * @param {Array} interior
     * @returns {Array}
     * @example
     * // get interior points
     * var exterior = line.exterior();
     *
     * // set interior points
     * line.interiors([[10, 20, 30, 40, 50, 60]]);
     *
     */

    Konva.Collection.mapMethods(Konva.PolyLine);
  })();
  