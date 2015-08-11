jQuery.editUI = function(jElem, editOptions, options) {
	options = options || {};
	jQuery.editUI.stash[jElem.attr('id')] = editOptions;
	
	for( var i=0; i<editOptions.length; i++ )
	{
		var editOps = editOptions[i];
		editOps.defaultValue = editOps.defaultValue || '';
		editOps.value = editOps.value || '';
		editOps.label = editOps.label || '';
		editOps.help = editOps.help || '';
		editOps.className = editOps.className || 'ui-input-block';
		jQuery.editUI.render[editOps.type](jQuery('<div class="'+editOps.className+'" id="'+jElem.attr('id')+'_editui_'+editOps.key+'"></div>').appendTo(jElem), editOps);
	}
};

jQuery.editUI.stash = {};
jQuery.editUI.getVals = function(jElem) {
	var editOps = jQuery.editUI.stash[jElem.attr('id')];
	var result = {};
	for( var i=0; i<editOps.length; i++ )
	{
		var value = jElem.find('#input_'+editOps[i].key).val();
		if( !editOps[i].validate || editOps[i].validate(value) ) {
			result[editOps[i].key] = editOps[i].transform ? editOps[i].transform(value) : value; 
		}
	}
	return result;
};

jQuery.editUI.setVals = function(jElem, nameVals) {
	var editOps = jQuery.editUI.stash[jElem.attr('id')];
	for( var name in nameVals )
	{
		if( jElem.find('#input_'+name).hasClass('checkbox') ) {
			jElem.find('#input_'+name).attr('checked', nameVals[name]);
		} else {
			jElem.find('#input_'+name).val(nameVals[name]);
		}
	}
};

jQuery.editUI.showOptional = function(jElem, bOnce) {
	if( !bOnce )
	{
		jElem.find('.ui-optional').show('slide', {direction: 'up' }, 1000);
	}
	else
	{
		jElem.find('.ui-optional:hidden:first').show('slide', {direction: 'up' }, 1000);
	}
	if( jElem.find('.ui-optional:hidden').length == 0 )
	{
		jElem.find('.ui-more').remove();
	}
};

jQuery.editUI.render = {
	autocomplete: function(elem, editOps) {
		this.string(elem, editOps);
		elem.find('input').autocomplete({ minLength: 0 ,source: editOps.source });
	},
	
	date: function(elem, editOps) {
		this.string(elem, editOps);
		elem.find('input').datepicker({changeMonth: true, changeYear: true, dateFormat: 'yy-mm-dd'});
	},

	email: function(elem, editOps) {
		this.string(elem, editOps);
		editOps.validate = editOps.validate ? editOps.validate : function(value) {
			return value.match(/^([a-zA-Z0-9_.-])+@(([a-zA-Z0-9-])+.)+([a-zA-Z0-9]{2,4})+$/) ? true : false;
		};
	},

	password: function(elem, editOps) {
		editOps.input_type = 'password';
		this.string(elem, editOps);
	},
	
	phone: function(elem, editOps) {
		this.string(elem, editOps);
		editOps.validate = editOps.validate ? editOps.validate : function(value) {
			if( !editOps.required && jQuery.trim(value) == "" )
				return true;
			value = editOps.transform(value);
			value = value.charAt(0) == '1' ? value : '1' + value;
			return value.length == 11 ? true : false;
		}
		editOps.transform = editOps.transform ? editOps.transform : function(value) {
			return value.replace(/[^\d]/g,'');
		}
	},

	number: function(elem, editOps) {
		this.string(elem, editOps);
		editOps.validate = editOps.validate ? editOps.validate : function(value) {
			if( !editOps.required && jQuery.trim(value) == "" )
				return true;
			return value.match(/[\d\-\(\)\.]+/) ? true : false;
		}
		editOps.transform = editOps.transform ? editOps.transform : function(value) {
			return value.replace(/[^\d]/g,'');
		}
	},
	
	postit: function(elem, editOps) {
		editOps.width = editOps.width ? editOps.width : 250;
		editOps.height = editOps.height ? editOps.height : 250;
		editOps.pos_x = editOps.pos_x ? editOps.pos_x : 0;
		editOps.pos_y = editOps.pos_y ? editOps.pos_y : 0;
		
		elem.addClass('postit');
		elem.parents().addClass('absolute-holder');
		elem.css({ position: 'absolute', top: editOps.pos_y, left: editOps.pos_x });
		elem.append('<label for="input_' + editOps.key + '">' + editOps.label + '</label>');
		
		editOps.pos_y += elem.find('label').height();
		elem.stickyNotes({controls:false, resizable: false, maxLength: 250, notes: [ {'id': 'sticky-'+editOps.key, text: editOps.defaultValue, width: editOps.width, height: editOps.height, pos_x: editOps.pos_x, pos_y: editOps.pos_y}]});
		if( editOps.editableDefault )
			jQuery('#note-sticky-'+editOps.key+' .jStickyNote p').trigger('dblclick');
	},
	
	textarea: function(elem, editOps) {
		var self = this;
		elem.addClass('textarea');
		editOps.rows = editOps.rows || 3;
		var userInput = jQuery('<textarea class="ui-corner-all" id="input_'+editOps.key+'"></textarea>');
		userInput.attr('rows',editOps.rows);

		if( editOps.optional )
		{
			elem.addClass('ui-optional');
		}

		elem.append('<div class="label-container"><label class="ui-edit-label" for="input_' + editOps.key + '">' + editOps.label + '</label></div>');
		elem.append(jQuery('<div class="ui-edit-input"></div>').append(userInput));
		elem.append('<div class="ui-edit-help"><span>&nbsp;</span>' + editOps.help + '</div>');
		
		if( editOps.defaultValue )
		{
			userInput.html(editOps.defaultValue);
		}
		userInput.change( function() {
			if( editOps.onChange )
			{
				editOps.onChange(userInput.text());
			}
		});
		userInput.focus(function(){
			if( userInput.val() == editOps['defaultValue'] )
			{
				userInput.val("").removeClass('ui-hint-text');
			}
			else
			{
				userInput.select();    
			}
		});
		userInput.blur( function() {
			if( userInput.val() == "" )
			{
				userInput.val(editOps['defaultValue']).addClass('ui-hint-text');
			}
		});
	},
	
	checkbox: function(elem, editOps) {
		var self = this;
		var userInput = jQuery('<input type="checkbox" class="checkbox ui-corner-all" id="input_'+editOps.key+'"></input>');

		if( editOps.optional )
		{
			elem.addClass('ui-optional');
		}
		
		elem.append('<div class="label-container"><label class="ui-edit-label" for="input_' + editOps.key + '">' + editOps.label + '</label></div>');
		elem.append(jQuery('<div class="ui-edit-input"></div>').append(userInput));
		elem.append('<div class="ui-edit-help"><span>&nbsp;</span>' + editOps.help + '</div>');
		
		if( editOps.defaultValue == 1 )
		{
			userInput.attr('checked', 'checked');
		}
		userInput.change( function() {
			 if( editOps.onChange )
			 {
				 editOps.onChange(userInput.attr("checked"));
			 }
		});
		if( editOps.onClick ) {
			userInput.click(editOps.onClick);
		}
		editOps.transform = editOps.transform ? editOps.transform : function() {
			return userInput.attr("checked") ? 1 : 0;
		};
	},
	
	dropdown: function(elem, editOps) {
		var self = this;
		var choices = editOps.choices;
		var userInput = jQuery('<select class="dropdown ui-corner-all" id="input_'+editOps.key+'"></select>');
		
		elem.append('<div class="label-container"><label class="ui-edit-label" for="input_' + editOps.key + '">' + editOps.label + '</label></div>');
		elem.append(jQuery('<div class="ui-edit-input"></div>').append(userInput));
		elem.append('<div class="ui-edit-help left-padded"><span>&nbsp;</span>' + editOps.help + '</div>');

		if (choices.length) {
			for( var i=0; i<choices.length; i++)
			{
				var name, value;
				if( typeof(choices[i]) == 'object' ) {
					name = choices[i].name;
					value = choices[i].value;
				} else {
					name = value = choices[i];
				}
				userInput.append(jQuery('<option></option>').val(value).html(name));
				if (value == editOps['defaultValue']) {
					userInput.find('option:last').attr('selected', 'selected');
				}
			}
		}
		else {
			for (var name in choices) {
				userInput.append(jQuery('<option></option>').val(choices[name]).html(name));
				if (choices[name] == editOps['defaultValue']) {
					userInput.find('option:last').attr('selected', 'selected');
				}
			}
		}
		 userInput.change( function() {
			 if( editOps.onChange )
			 {
				 editOps.onChange(userInput.attr("value"));
			 }
		 });
		if( userInput.selectmenu )
			userInput.selectmenu({style: 'dropdown'});
		if( editOps.optional )
		{
			elem.addClass('ui-optional');
		}
	},
	
	string: function(elem, editOps) {
		var self = this;
		var userInput = jQuery('<input class="text ui-corner-all" type="'+(editOps.input_type||'text')+'" id="input_'+editOps.key+'">'); 

		if( editOps.optional )
		{
			elem.addClass('ui-optional');
		}
		 
		if( editOps.value != '')
		{
			userInput.attr("value", editOps.value);
		}                                                                             
		else
		{
			userInput.attr("value", editOps['defaultValue'] ).addClass('ui-hint-text');
		}
		 elem.append('<div class="label-container"><label class="ui-edit-label" for="input_' + editOps.key + '">' + editOps.label + '</label></div>');
		 elem.append(jQuery('<div class="ui-edit-input"></div>').append(userInput).append('<div class="ui-edit-error"></div>'));
		 elem.append('<div class="ui-edit-help left-padded"><span>&nbsp;</span>' + editOps.help + '</div>');
		 
		 userInput.change( function() {
			 if( editOps.onChange )
			 {
				 editOps.onChange(userInput.attr("value"));
			 }
		 });
		 userInput.focus(function(){
			 if( userInput.attr("value") == editOps['defaultValue'] )
			 {
				 userInput.attr("value", "").removeClass('ui-hint-text');
			 }
			 else
			 {
				 userInput.select();    
			 }
		 });
		 userInput.blur( function() {
			 if( userInput.attr("value") == "" )
			 {
				userInput.attr("value", editOps['defaultValue']).addClass('ui-hint-text');
			 }
			 else if( userInput.qtip && (editOps.validate && editOps.validate(userInput.val()) !== true) || (editOps.required && jQuery.trim(userInput.val()) == "") )
			 {
				userInput.qtip({ content: 'This doesnt seem right', 
								position:{ 
									corner: {
										tooltip: 'leftMiddle',
										target: 'rightMiddle'
									}
								},
								show: { ready: true },
								style: { name: 'cream' }
							});
			 }
			 else
			 {
				if( userInput.qtip && userInput.data('qtip') ) {
					userInput.qtip("destroy");
				}
			 }
		});
	},
	
	link: function(elem, editOps)
	{
		var link = jQuery('<a class="ui-clickable">'+editOps.label+'</a>');
		elem.addClass('ui-more').append(link);
		link.click(editOps.onClick);
	},
	
	button: function(elem, editOps)
	{
		var btn = jQuery('<button>'+editOps.label+'</button>');
		elem.append(btn);
		btn.button().click(editOps.onClick);
	},
	
	uploader: function(elem, editOps)
	{
		elem.append('<div class="label-container"><label class="ui-edit-label" for="input_' + editOps.key + '">' + editOps.label + '</label></div><div class="ui-edit-input" id="input_'+editOps.key+'"></div>');
		if( editOps.defaultValue ) {
			elem.append('<img class="uploader-img" src="'+editOps.defaultValue+'"/>');
		}
		var uploader = new qq.FileUploader({
			element: elem.find('.ui-edit-input')[0],
			action: editOps.target,
			onComplete: function(id, fileName, responseJSON) {
				elem.find('.ui-edit-input').val(responseJSON.path);
				elem.find('img').remove();
				elem.append('<img class="uploader-img" src="'+responseJSON.path+'"/>');
			}
		});           
	},
	
	slider: function(elem, editOps)
	{
		var infoDiv = jQuery('<span>'+editOps.label+'</span><div class="floater-right"><input class="slider-output ui-widget-header" type="text" style="border: 0;"/></div>');
		var sliderDiv = jQuery('<div class="ui-slider"></div>');
		elem.append(infoDiv).append(sliderDiv);
		if( editOps.optional ) {
			elem.addClass('ui-optional');
		}
		if( editOps.help ) {
			elem.append('<div class="ui-edit-help">'+editOps.help+'</div>');
		}
		if( typeof(editOps.range) == 'string' )
		{
			elem.find('.slider-output').val(editOps.onChange(editOps.defaultValue));
			elem.find('.ui-slider').slider({
				animate: true,
				range: editOps.range,
				min: editOps.min,
				max: editOps.max,
				value: editOps.defaultValue,
				slide: function( event, ui ) {
					elem.find('.slider-output').val(editOps.onChange(ui.value));
				}
			});
		}
		else
		{
			elem.find('.slider-output').val(editOps.onChange(editOps.defaultValues));
			elem.find('.ui-slider').slider({
				animate: true,
				range: true,
				min: editOps.min,
				max: editOps.max,
				values: editOps.defaultValues,
				slide: function( event, ui ) {
					elem.find('.slider-output').val(editOps.onChange(ui.values));
				}
			});
		}
	}
};


