import axios, { AxiosResponse, AxiosError } from 'axios';
import { selectPlatform, calculateAuthorizationHeader } from '../auth'
import fs from 'fs';
import chalk from 'chalk'
import csv from 'csv-parser';

export async function updateUsers(file:any, credentialsfile:any) {
  const platform = await selectPlatform(credentialsfile);
    let authHeader
    let pageNumber = 0;
    let perPage = 50;
    let totalPages = Infinity;

    let users:any = await new Promise((resolve, reject) => {
        let users = [];
        fs.createReadStream(file)
            .pipe(csv({
                mapHeaders: ({ header }) => header.replace(/\s+/g, '____')
            }))
            .on('data', (row) => {
              users.push(row);
            })
            .on('end', () => {
                console.log(chalk.green('CSV file successfully processed\n'));
                resolve(users);
            })
            .on('error', reject);
    });

  //get all roles from the platform
  pageNumber = 0;
  perPage = 20;
  totalPages = Infinity;
  let allRoles = [];

  while (pageNumber <= totalPages-1) {
    authHeader = await calculateAuthorizationHeader({
      id: platform.cleanedID,
      key: platform.cleanedKEY,
      host: platform.apiUrl,
      url: '/api/authn/v2/roles?page='+pageNumber+'&size='+perPage,
      method: 'GET'
    });
    const response = await axios.get(`https://${platform.apiUrl}/api/authn/v2/roles`, {
      headers: {
        'Authorization': authHeader
      },
      params: {
          page: pageNumber,
          size: perPage
      }
    });

    allRoles = allRoles.concat(response.data._embedded.roles);
    totalPages = response.data.page.total_pages;
    pageNumber++;
  }
  

  //get all teams from the platform
  pageNumber = 0;
  perPage = 20;
  totalPages = Infinity;
  let allTeams = [];

  while (pageNumber <= totalPages-1) {
    authHeader = await calculateAuthorizationHeader({
      id: platform.cleanedID,
      key: platform.cleanedKEY,
      host: platform.apiUrl,
      url: '/api/authn/v2/teams?page='+pageNumber+'&size='+perPage,
      method: 'GET'
    });
    const response = await axios.get(`https://${platform.apiUrl}/api/authn/v2/teams`, {
      headers: {
        'Authorization': authHeader
      },
      params: {
          page: pageNumber,
          size: perPage
      }
    });

    allTeams = allTeams.concat(response.data._embedded.teams);
    totalPages = response.data.page.total_pages;
    pageNumber++;
  }




  //loops through all users and update 
  for ( let user of users ) {
    if (user.Is____SAML____User == 'true') {
      console.log(chalk.red('User is a SAML user, skipping update for UserID: '+user.User____ID+' - '+user.User____Name+'\n'));
    }
    else {

      console.log(chalk.green('Updating user information for UserID: '+user.User____ID+' - '+user.User____Name))

      //create roles payload
      let rolesPayload = []
      let rolesArray = user.Roles.split(',')
      for (let role of rolesArray) {
        let roleElement = allRoles.find((element: any) => element.role_description == role);
        if (roleElement) {
          rolesPayload.push({
            role_id: roleElement.role_id
          });
        } else {
          console.log(chalk.yellow(`Role description "${role}" not found.`));
        }
      }

      //if TeamAdmin is not part of roles but should be
      if ( user.Team____Admin == "Yes" && !rolesArray.includes('teamAdmin')) {
        let roleElement = allRoles.find((element: any) => element.role_description == 'Team Admin');
        rolesPayload.push({
          role_id: roleElement.role_id
        });
      }


      //creating teams payload
      let teamsPayload = []
      let teamsArray = user.Teams.split(',')
      for (let team of teamsArray) {
        let teamElement = allTeams.find((element: any) => element.team_name == team);
        if (teamElement) { // Check if teamElement is not undefined
          //check team admin for this team
          let teamAdminTeamsArray = user.Team____Admin____Teams.split(',')
          let relationshipSetting = 'MEMBER';
          if (teamAdminTeamsArray.includes(team)) {
            relationshipSetting = "ADMIN";
          }
          teamsPayload.push({
            team_id: teamElement.team_id,
            relationship: relationshipSetting
          });

        } else {
          if (team != '') {
            console.log(chalk.yellow(`Team "${team}" not found on the platform.`));
            console.log(chalk.yellow(`Team "${team}" will be created on the platform.`));
            //create team
            authHeader = await calculateAuthorizationHeader({
              id: platform.cleanedID,
              key: platform.cleanedKEY,
              host: platform.apiUrl,
              url: '/api/authn/v2/teams',
              method: 'POST'
            })
            const response = await axios.post('https://'+platform.apiUrl+'/api/authn/v2/teams', {
              team_name: team
            }, {
              headers: {
                'Authorization': authHeader
              }
            });
            teamsPayload.push({
              team_id: response.data.team_id
            });
            console.log(chalk.yellow('Team created'));
          }
        }
    
      }


      //creating first name and last name payload
      let nameArray = user.Firstname____Lastname.split(' ');
      let firstName = nameArray[0];
      let lastName = nameArray[1];


//only update users that don't have the admin role
if ( rolesArray.includes('Administrator')) {
  console.log(chalk.red('User is an admin, skipping update for UserID: '+user.User____ID+' - '+user.User____Name+'\n'));
}
else {

      authHeader = await calculateAuthorizationHeader({
          id: platform.cleanedID,
          key: platform.cleanedKEY,
          host: platform.apiUrl,
          url: '/api/authn/v2/users/'+user.User____ID+'?partial=true',
          method: 'PUT'
      })
      const response = await axios.put('https://'+platform.apiUrl+'/api/authn/v2/users/'+user.User____ID+'?partial=true', {
        roles: rolesPayload,
        teams: teamsPayload,
        first_name: firstName,
        last_name: lastName,
        login_enabled: user.Login____Enabled,
      }, {
          headers: {
              'Authorization': authHeader
          }
      });
      console.log(chalk.green('User updated UserID: '+user.User____ID+' - '+user.User____Name+'\n'));
}      






    }
  }
}