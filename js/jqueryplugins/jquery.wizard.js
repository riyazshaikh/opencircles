/**
 * ui.wizard - a jQuery plugin that makes the most of screen real estate
 * 
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Author: Christoph Baudson (christoph AT osgeo DOT org)
 * 
 * Contributors: Verena Diewald, Karim Malhas
 * 
 * Version: 0.1
 * 
 * Changelog:
 * - initial version
 * 
 * Date: Aug 1st, 2010
 * 
 * Documentation:
 * see http://baudson.cute-ice.de/wizard/demo/
 */
$.widget("testbaudson.wizard", {
	options: {
		fade: false,
		onClickLink: function () {
			return true;
		},
		onBeforeClickLink: function () {
			return true;
		}
	},
	_navigate: function ($target, path) {
		var that = this;
		var triggerEvents = function () {
			that._trigger("to" + $target.attr("id").toLowerCase(), null, {});
			that._trigger("to", null, {});
			that.options.onClickLink(path);			
		};

		var $active = $target.siblings("div:visible");
		if (this.options.fade) {
			$active.fadeOut(function () {
				$target.fadeIn(triggerEvents);
			});
		}
		else {
			$active.hide();
			$target.show();
			triggerEvents();
		}
	},
	_getPath: function ($target) {
		var m = $target.metadata({
			type: "attr",
			name: "wizardPath"
		});
		return (m && m.path) ? m.path.split("/") : [];
	},
	_clickHandler: function (e, $target) {
		this._navigate($target, this._getPath($target));
		if (e) {
			e.preventDefault();
		}
	},
	to: function (link, e) {
		var $target;
		if (e === undefined) {
			$target = link;
		}
		else {
			// IE returns the URL as absolute, firefox as relative
			var $link = link && link.jquery ? link : $(link);
			if ($link.size() !== 1) {
				return;
			}
			var stringparts = $link.attr("href").split('#');
			var href = "#" + stringparts[stringparts.length - 1];
			$target = $(href);
		}
		
		if (!$target || !$target.jquery || $target.size() !== 1) {
			return;
		}

		var found = false;
		var abort = false;
		var wizardInstance = this;
		$target.parents().each(function () {
			if (abort || found) {
				return;
			}
			var $currentElement = $(this);

			// not a wizard
			if (!$currentElement.data("wizard")) {
				return;
			}
			// not this target's wizard (necessary for nested wizards)
			if ($currentElement.data("wizard") !== wizardInstance) {
				abort = true;
				return;
			}				
			// this target's wizard
			found = true;
			return;
		});
		if (abort || !found) {
			return;
		}

		var $active = $target.siblings("div:visible");
		var proceed = (link === undefined) ? 
			true : this.options.onBeforeClickLink(e, $(link), $active, $target);
		if (proceed === false) {
			return;
		}
		this._clickHandler(e, $target);
	},
	_create: function () {
		this.element.data("wizard", wizardInstance);
		if (this.options.startWith && this.options.startWith.jquery) {
			var path = this._getPath(this.options.startWith);
			this._trigger("to" + this.options.startWith.attr("id").toLowerCase(), null, {});
			this._trigger("to", null, {});
			this.options.onClickLink(path);			
		}

		var wizardInstance = this;
		$("a.wizard").live("click", function (e) {
			wizardInstance.to(this, e);
		});
	}
});
