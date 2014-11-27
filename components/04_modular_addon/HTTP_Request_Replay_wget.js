/*
 * --------------------------------------------------------
 * project
 *     name:    moz-rewrite
 *     summary: Firefox add-on that functions as a light-weight (pseudo) rules-engine for easily modifying HTTP headers in either direction
 *     url:     https://github.com/warren-bank/moz-rewrite
 * author
 *     name:    Warren R Bank
 *     email:   warren.r.bank@gmail.com
 *     url:     https://github.com/warren-bank
 * copyright
 *     notice:  Copyright (c) 2014, Warren Bank
 * license
 *     name:    GPLv2
 *     url:     http://www.gnu.org/licenses/gpl-2.0.txt
 * --------------------------------------------------------
 */

var EXPORTED_SYMBOLS	= [ "HTTP_Request_Replay_wget" ];

const Ci				= Components.interfaces;
const Cc				= Components.classes;
const Cu				= Components.utils;
const Cr				= Components.results;

Cu.import("resource://Moz-Rewrite/HTTP_Request_Replay.js");

var HTTP_Request_Replay_wget = HTTP_Request_Replay.extend({
	"at_startup": function(){
		this._super();
		var self = this;

		// sanity check
		if (! self.download_directory){return;}

		try {
			// get file/directory handles
			self.binary_executable = self.get_file_handle('run.wget.executable_file.path');
		}
		catch(e){
			self.log('(at_startup|error): ' + e.message);
		}
	},

	"replay_request": function(request, download_file){
		var self = this;

		self.debug() && self.debug('(replay_request|checkpoint|1): ' + 'beginning sanity checks..');

		// validate file/directory handles
		if (! self.validate_file_handles(download_file)){return;}

		self.debug() && self.debug('(replay_request|checkpoint|2): ' + 'file handles are OK..');

		if (
			(! request) ||
			(! request.url)
		){return;}

		self.debug() && self.debug('(replay_request|checkpoint|3): ' + 'HTTP request is OK..');

		var wget_options, command_line_args, header_name, header_value;

		var push_args = function(args){
			for (var i=0; i<args.length; i++){
				command_line_args.push(args[i]);
			}
		};

		wget_options			= self.prefs.getCharPref('run.wget.options');
		command_line_args		= wget_options.split(/\s+/);

		/* --------------------------------------
		 * references:
		 *     http://www.gnu.org/software/wget/manual/wget.html
		 * topics:
		 *   - https://forums.mozilla.org/viewtopic.php?t=9784&p=20984
		 *     important takeaways:
		 *       - switch and value are separate array elements
		 *       - do NOT wrap long filepaths in quotes
		 *   - http://en.wikipedia.org/wiki/POST_%28HTTP%29#Use_for_submitting_web_forms
		 *     important takeaways:
		 *       - POST data is already URL encoded
		 * --------------------------------------
		 */

		if (download_file){
			// output filepath
			push_args([ '-O', (download_file.path) ]);
		}
		else {
			// output directory
			push_args([ '-P', (self.download_directory.path) ]);
		}

		// HTTP request headers
		if (request.headers){
			for (header_name in request.headers){
				header_value	= request.headers[header_name];

				push_args([ '--header', (header_name + ': ' + header_value) ]);
			}
		}

		// POST message body
		if (request.post_data){
			push_args([ '--method', 'POST' ]);
			push_args([ '--post-data', (request.post_data) ]);
		}

		// URL
		push_args([ (request.url) ]);

		self.debug() && self.debug('(replay_request|checkpoint|4): ' + 'spawning process => "' + self.binary_executable.path + '" "' + command_line_args.join('" "') + '"');

		self.run_process(self.binary_executable, command_line_args);
	}

});
