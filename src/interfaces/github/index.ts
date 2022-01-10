import fs from 'fs'

import githubConfig from './config.js'
import { App } from '@octokit/app'

/**
 * 
 * @param title The title of the new issue
 * @param description The description of the new issue
 * @returns The url of the created issue
 */
export async function createIssue(title: string, description: string, labels: string[] = []): Promise<string | null> {
    try {
        const app = new App({
            appId: githubConfig.APP_ID,
            privateKey: fs.readFileSync(githubConfig.PRIVATE_KEY_FILE, "utf8")
        });
        
        const installation = await app.octokit.request("GET /repos/{owner}/{repo}/installation",{
            owner: githubConfig.REPOSITORY_OWNER,
            repo: githubConfig.REPOSITORY_NAME
        });
        
        const installationId = installation.data.id;
        const octokit = await app.getInstallationOctokit(installationId);
        const result = await octokit.request("POST /repos/{owner}/{repo}/issues", {
            owner: githubConfig.REPOSITORY_OWNER,
            repo: githubConfig.REPOSITORY_NAME,
            title: title,
            body: description,
            labels: labels
        });
        return result.data.html_url;
    }
    catch (error) {
        console.error(error);
        return null;
    }
}