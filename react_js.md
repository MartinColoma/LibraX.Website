# ReactJS Step-by-Step Instructions
*Note: If you're using vscode to view this markdown instruction. Press Ctrl+Shift+V to make it in preview mode.*
## NodeJS Installation and Creating React App using Vite
1. Install Node.js from nodejs.org
2. In your VSCode, open terminal and check the version of installed node js using this command
   ```bash
    node -v
   ```
3. Now, we're ready to create our react app. Let's run this command in the terminal
   ```bash
    npm create vite@latest
   ```
   Terminal will prompt to install following packages
   
   Just  press 'y' to proceed
4. After all the installation of packages. Terminal will ask you to input the project name.
   Mine is **hok_library**
5. You will select the framework and variant you want to use. (Use arrow keys to navigate and Enter key to select)
   1. Choose React as your framework.
   2. Choose Typescript
6. Now your project has been created. Run the following commands in the terminal to continue:
   1. Change directory to your project folder
   2. Run ```npm install``` or ```npm i``` for short
   3. Make sure that if you run ```npm run dev``` you are in the project folder.
## Create & Initialize a GitHub Repository
Requirements: Git should be already installed on your desktop.
1. While in your worspace folder, open your terminal and initialize git.

    Run ```git init```
2. Add your files to Git
   
   Run ```git add .```
3. Commit Your Files
   
   Run ```git commit -am "Your Commit Message Here```
4. Create a Remote Repository
   1. Create a new private repository on your github account
   2. Copy the web url of your repository
5. Link your Local Repo to GitHub
   
   Run ```git remote add origin https://github.com/yourusername/my-project.git```

   In our case, run this command:

   ```git remote add origin https://github.com/MartinColoma/HOK-Library-Project.git```
6. Push your code to GitHub
   
   Run ```git push -u origin main``` 
   
   Run ```git push --set-upstream origin main```

Optional:
   1. To reset your branch from the latest remote commit

      Run ``` git reset --hard origin/main``` 
      
      (You can change the 'main' with the branch name you're currently in)
   2. To forcefully push a latest commit from another branch to your target branch

      Run ```git push origin HOK:main --force```
      
      HOK is the incoming merge update
      
      main is the base branch receiving the push forced update

