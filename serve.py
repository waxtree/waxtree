import http.server, os
os.chdir('/Users/lucanavi/Desktop/Rabbithole/crate-tree')
http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=3847, bind='127.0.0.1')
