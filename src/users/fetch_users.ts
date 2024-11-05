import axios, { AxiosResponse, AxiosError } from 'axios';
import { selectPlatform, calculateAuthorizationHeader } from '../auth'
import fs from 'fs';
import chalk from 'chalk'

export async function fetchUsers(file:any, apiID:any, apiKey:any) {
    const platform = await selectPlatform(apiID, apiKey);

    let pageNumber = 0;
    let perPage = 20;
    let totalPages = Infinity;
    let users = []

    //crete csv header
    let csv = `"User ID",`;
    csv += `"User Name",`;
    csv += `"Firstname Lastname",`;
    csv += `"E-Mail",`;
    csv += `"SAML Username",`;
    csv += `"Login Enabled",`;
    csv += `"User is Active",`;
    csv += `"Is SAML User",`;
    csv += `"Roles",`;
    csv += `"Teams",`;
    csv += `"Team Admin",`;
    csv += `"Team Admin Teams"\n`;


    while (pageNumber <= totalPages) {
        const authHeader = await calculateAuthorizationHeader({
            id: platform.cleanedID,
            key: platform.cleanedKEY,
            host: platform.apiUrl,
            url: '/api/authn/v2/users?page='+pageNumber+'&size='+perPage,
            method: 'GET'
        })

        const response = await axios.get('https://'+platform.apiUrl+'/api/authn/v2/users', {
            headers: {
                'Authorization': authHeader
            },
            params: {
                page: pageNumber,
                size: perPage
            }
        });
        users = users.concat(response.data._embedded.users);
        //totalPages = response.data.total_pages;

        if (response.data && response.data._embedded && response.data._embedded.users) {
            users = users.concat(response.data._embedded.users);
        } else {
            console.error('Unexpected response structure:', response.data);
            break;
        }
        
        if (response.data.page && response.data.page.total_pages !== undefined) {
            totalPages = response.data.page.total_pages;
        } else {
            console.error('total_pages not found in response:', response.data);
            break;
        }
        pageNumber++;
    }



    for ( let user of users ) {
        console.log(chalk.green('Fetching information for UserID: ', user.user_id));

        const authHeader = await calculateAuthorizationHeader({
            id: platform.cleanedID,
            key: platform.cleanedKEY,
            host: platform.apiUrl,
            url: '/api/authn/v2/users/'+user.user_id,
            method: 'GET'
        })

        const response = await axios.get('https://'+platform.apiUrl+'/api/authn/v2/users/'+user.user_id, {
            headers: {
                'Authorization': authHeader
            },
        });

        //if ( response.data.first_name == "Julian" && response.data.last_name == "Test" ) {
        //console.log(JSON.stringify(response.data))
        //}

        let roles = [];
        let teams= [];
        let teamAdmin;
        let teamAdminTeams = [];
        csv += `"${response.data.user_id}",`;
        csv += `"${response.data.user_name}",`;
        csv += `"${response.data.first_name} ${response.data.last_name}",`;
        csv += `"${response.data.email_address}",`;
        csv += `"${response.data.saml_subject}",`;
        csv += `"${response.data.login_enabled}",`;
        csv += `"${response.data.active}",`;
        csv += `"${response.data.saml_user}",`;
        //csv += `"${response.data.platform_user}",`;

        for ( let role of response.data.roles ) {
            if ( role.role_description == "Team Admin" && teamAdmin == undefined) {
                teamAdmin = "Yes";
            }

            roles.push(role.role_description);
        }
        csv += `"${roles.join(",")}",`;

        for ( let team of response.data.teams ) {
            teams.push(team.team_name);
        }

        if (teamAdmin == "Yes") {
            for ( let team of response.data.teams ) {
                if ( team.relationship.name == "ADMIN" ) {
                    teamAdminTeams.push(team.team_name);
                }
            }
            csv += `"${teams.join(",")}",`;
        }
        else {
            csv += `"${teams.join(",")}",`;
        }
        csv += `"${teamAdmin}",`;
        csv += `"${teamAdminTeams}",\n`;
        
    }
    fs.appendFileSync(file, csv)
    console.log(chalk.green('User data written to: ', file));

  }

 


