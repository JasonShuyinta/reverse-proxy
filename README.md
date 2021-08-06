# reverse-proxy
In order to run the program:
1. Create a new folder and clone the repository using the following commands on a git shell:
- git init
- git clone https://github.com/JasonShuyinta/reverse-proxy.git
2. Once the repository is downloaded, navigate to the main folder. For Windows users:
- cd reverse-proxy
3. Install all the necessary dependencies with the npm command:
- npm install
4. Once the installation is finished, open 4 terminals, navigate with each of them to the
reverse-proxy folder and run the following commands:
- node server-one.js
- node server-two.js
- node reverse-proxy.js
- npm start
If the steps are done correctly, a web page should open at http://localhost:8080
