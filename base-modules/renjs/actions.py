#!/usr/bin/env python3
import os
import sys
import yaml
import shutil
import pathlib
from datetime import date

module_folder = pathlib.Path(os.getcwd()).resolve()
base_module = pathlib.Path(__file__).parent.resolve()

#print('Module Folder:', module_folder)
#print('Base Module Folder:', base_module)


def pack():
	print('= Packing module into a SCORM package ============')


	# Create paths to folders
	src_folder = os.path.join(base_module, 'src')
	scorm_folder = os.path.join(base_module, 'scorm')
	dest_folder = os.path.join(module_folder, 'tmp')
	res_folder = os.path.join(dest_folder, 'res')
	

	# Load module's info
	with open(os.path.join(module_folder, 'info.yaml'), "r", encoding="utf8") as file:
		info = yaml.safe_load(file)


	# Clear old files
	print('Removing cached files...')
	# Delete old zip if it has the same name
	try:
		os.unlink(os.path.join(module_folder, 'scorm-v' + info['module']['version'] + '-' + str(date.today()).replace('-','') + '.zip'))
	except Exception as e:
		pass
	# Delete old cache folder
	shutil.rmtree(dest_folder, ignore_errors=True)


	# Copy files from source
	print('Coping source files...')
	# Copy scorm template files
	try:
		shutil.copytree(scorm_folder, dest_folder, copy_function=shutil.copy, dirs_exist_ok=True)
	except Exception as e:
		pass
	# Copy renjs template files
	try:
		shutil.copytree(src_folder, res_folder, copy_function=shutil.copy, dirs_exist_ok=True)
	except Exception as e:
		pass
	# Copy Story
	if os.path.exists(os.path.join(module_folder, 'Story.yaml')):
		try:
			os.unlink(os.path.join(res_folder, 'story', 'Story.yaml'))
		except Exception as e:
			pass
		try:
			shutil.copyfile(os.path.join(module_folder, 'Story.yaml'), os.path.join(res_folder, 'story', 'Story.yaml'))
		except Exception as e:
			pass
	# Copy extra files
	if os.path.exists(os.path.join(module_folder, 'extra')):
		try:
			shutil.copytree(os.path.join(module_folder, 'extra'), res_folder, dirs_exist_ok=True)
		except Exception as e:
			pass


	# Analyse the story line
	print('Analyse story line...')

	# Load storyline
	with open(os.path.join(res_folder, 'story', 'Story.yaml'), 'r', encoding="utf8") as file:
		story = yaml.safe_load(file)

	# Variables to record info about the storyline
	visuals = []
	plugins = []
	chars_talk = []

	# Analyse each scene
	for scene in story:
		# Analyse each command
		for command in story[scene]:
			# Get command
			cmd = list(command.keys())[0].split(' ')
			# If this is a show/hide command
			if len(cmd) == 2 and (cmd[0] == 'show' or cmd[0] == 'hide'  or cmd[0] == 'animate'):
				# Log the charachter/background/item asset name
				if not cmd[1] in visuals:
					visuals.append(cmd[1])
			# If this is a call command
			elif len(cmd) == 2 and cmd[0] == 'call':
				# Log the plugin name
				if not cmd[1] in plugins:
					plugins.append(cmd[1])
			# If this is a says command
			elif len(cmd) >= 2 and cmd[1] == 'says':
				# Log charachter talking
				if not cmd[0] in chars_talk:
					chars_talk.append(cmd[0])

	# Print statistics
	# TODO[disabled]: print('    Visuals used: ' + str(len(visuals)) + ' - (' + ('|'.join(visuals)) + ')')
	# TODO[disabled]: print('    Plugins used: ' + str(len(plugins)) + ' - (' + ('|'.join(plugins)) + ')')
	# TODO[disabled]: print('    Chars talk  : ' + str(len(chars_talk)) + ' - (' + ('|'.join(chars_talk)) + ')')


	# TODO: Remove plugins-related files if they are not in use


	# Based on the analysis, delete assets that are not needed
	'''
	print('Remove assets that are not needed...')
	# Load setup
	file_to_update = os.path.join(res_folder, 'story', 'Setup.yaml')
	with open(file_to_update, 'r', encoding="utf8") as file:
		setup = yaml.safe_load(file)

	# Log files in use an files to be deleted
	files_in_use = []
	files_not_in_use = []

	# Delete not needed backgrounds
	if 'backgrounds' in setup and setup['backgrounds']:
		backgrounds_to_delete = []
		for bg in setup['backgrounds']:
			if not bg in visuals:
				files_not_in_use.append(setup['backgrounds'][bg])
				backgrounds_to_delete.append(bg)
			else:
				files_in_use.append(setup['backgrounds'][bg])
		for bg in backgrounds_to_delete:
			del setup['backgrounds'][bg]

	# Delete not needed characters
	if 'characters' in setup and setup['characters']:
		characters_to_delete = []
		for char in setup['characters']:
			if not char in visuals:
				for look in setup['characters'][char]['looks']:
					file = setup['characters'][char]['looks'][look]
					if not file in files_not_in_use:
						files_not_in_use.append(file)
				characters_to_delete.append(char)
			else:
				for look in setup['characters'][char]['looks']:
					file = setup['characters'][char]['looks'][look]
					if not file in files_in_use:
						files_in_use.append(file)
		for char in characters_to_delete:
			del setup['characters'][char]

	# Delete not needed items
	if 'cgs' in setup and setup['cgs']:
		items_to_delete = []
		for item in setup['cgs']:
			if not item in visuals:
				files_not_in_use.append(setup['cgs'][item])
				items_to_delete.append(item)
			else:
				files_in_use.append(setup['cgs'][item])
		for item in items_to_delete:
			del setup['cgs'][item]

	# Apply changes on Setup
	with open(file_to_update, 'w', encoding="utf8") as file:
		file.write(yaml.dump(setup, sort_keys=False))

	# Delete files that are not in use
	files_not_in_use.append('assets/backgrounds/_dev.xcf')	
	counter = 0
	for file in files_not_in_use:
		if not file in files_in_use:
			counter += 1
			try:
				os.unlink(os.path.join(res_folder, file))
			except Exception as e:
				pass
	print('    Removed ' + str(counter) + ' assets.')
	'''


	# Update scorm package information
	print('Updating informations...')
	file_to_update = os.path.join(dest_folder, 'imsmanifest.xml')

	# Load file
	with open(file_to_update, 'r', encoding="utf8") as file:
		filedata = file.read()

	# Make changes on the file
	filedata = filedata.replace('{{item-id}}', info['module']['id'])
	filedata = filedata.replace('{{organization-id}}', info['module']['organisation'])
	filedata = filedata.replace('{{learning-module-name}}', info['module']['name'])
	res_files = []

	# Record all files of the scorm package
	for currentpath, folders, files in os.walk(res_folder):
		for file in files:
			fpath = os.path.join(currentpath, file)
			res_files.append('      <file href="' + os.path.relpath(fpath, dest_folder) + '"/>')
	filedata = filedata.replace('{{res-files-xml}}', '\n'.join(res_files))

	# Apply changes
	with open(file_to_update, 'w', encoding="utf8") as file:
		file.write(filedata)

	# Update game.js with module info
	file_to_update = os.path.join(dest_folder, 'res', 'js', 'game.js')

	# Read file
	with open(file_to_update, 'r', encoding="utf8") as file:
		filedata = file.read()

	# Update info
	filedata = filedata.replace('{{item-id}}', info['module']['id'])
	filedata = filedata.replace('{{organization-id}}', info['module']['organisation'])
	filedata = filedata.replace('{{learning-module-name}}', info['module']['name'].replace('\'','\\\''))

	# Apply changes
	with open(file_to_update, 'w', encoding="utf8") as file:
		file.write(filedata)


	# Repack storyline so that no comments are left
	file_to_update = os.path.join(res_folder, 'story', 'Story.yaml')
	with open(file_to_update, 'r', encoding="utf8") as file:
		storyline = yaml.safe_load(file)
	with open(file_to_update, 'w', encoding="utf8") as file:
		file.write(yaml.dump(storyline, sort_keys=False))


	print('Generating package...')
	shutil.make_archive(os.path.join(module_folder, 'scorm-' + info['module']['version'] + '-' + str(date.today()).replace('-','')), 'zip', dest_folder)
	print('Removing cached files...')
	shutil.rmtree(dest_folder, ignore_errors=True)


def webserver():
	import http.server
	import socketserver
	import os

	class CustomServer(http.server.SimpleHTTPRequestHandler):
		def translate_path(self, path):
			#print('from', path)
			#path = os.path.normpath(os.path.join(os.path.abspath(base_module), path.lstrip('/')))
			#print('to', path)
			return path

		def do_GET(self):
			path_route = self.path.split('?')[0]
			#print('Path: ' + path_route)
			#print('do_GET start', path_route)

			real_path = os.path.join(base_module, 'src' + self.path)

			# Default page
			if path_route == '/':
				path_route = '/index.html'
				#print('Redirecting request to ' + path_route + ' ...')
				real_path = os.path.join(base_module, 'src', 'index.html')

			# Check if story and load it from local folder
			if path_route == '/story/Story.yaml':
				path = os.path.join(module_folder, 'Story.yaml')
				try:
					f = open(path, 'rb')
					#print('Loading Story.yaml from local folder ...')
					self._handleTheFile(path, f)
					return
				except OSError:
					pass

			# Check if in extra
			try:
				path = os.path.join(module_folder, 'extra', path_route.lstrip('/'))
				print('extra check', path)
				f = open(path, 'rb')
				f.close()
				#print('Loading file from ' + path + ' from extra folder ...')
				#self._handleTheFile(path, f)
				real_path = os.path.join(module_folder, 'extra', path_route.lstrip('/'))
			except OSError:
				pass

			# Load from ./src
			#print('Loading file from src from src folder ...')
			#self.path = '/src' + self.path
			self.path = os.path.normpath(real_path)
			#print('do_GET end', self.path)
			return super().do_GET()
			#f = open(real_path, 'rb')
			#self._handleTheFile(real_path, f)
			#return

		def _handleTheFile(self, path, file):
			ctype = self.guess_type(path)
			fs = os.fstat(file.fileno())
			
			print(ctype)
			
			self.send_response(200)
			self.send_header("Content-type", ctype)
			self.send_header("Content-Length", str(fs[6]))
			self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
			self.end_headers()            
			try:
				self.copyfile(file, self.wfile)
			finally:
				file.close()

	try:
		host = '127.0.0.1'
		port = 5000
		server = socketserver.TCPServer((host, port), CustomServer)
		print(f'Serving game at http://{host}:{port}')
		server.serve_forever()
	except KeyboardInterrupt:
		pass
	finally:
		server.server_close()


if __name__ == '__main__':
	command = sys.argv[1].lower()

	# Pack into SCORM
	if command == 'pack' or command == 'zip':
		pack()

	elif command == 'test' or command == 'webserver':
		webserver()

