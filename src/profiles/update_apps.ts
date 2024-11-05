import axios, { AxiosResponse, AxiosError } from 'axios';
import { selectPlatform, calculateAuthorizationHeader } from '../auth'
import fs from 'fs';
import chalk from 'chalk'
import csv from 'csv-parser';

export async function updateApps(file:any, apiID:any, apiKey:any) {
    const platform = await selectPlatform(apiID, apiKey);
    let authHeader
    let pageNumber = 0;
    let perPage = 50;
    let totalPages = Infinity;

    let apps:any = await new Promise((resolve, reject) => {
        let apps = [];
        fs.createReadStream(file)
            .pipe(csv({
                mapHeaders: ({ header }) => header.replace(/\s+/g, '____')
            }))
            .on('data', (row) => {
                apps.push(row);
            })
            .on('end', () => {
                console.log(chalk.green('CSV file successfully processed'));
                resolve(apps);
            })
            .on('error', reject);
    });

    console.log(chalk.green('Fetching all required info from the platform'));


    //get all teams from the platform
    pageNumber = 0;
    perPage = 50;
    totalPages = Infinity;
    let platformTeams:any = []
    while (pageNumber < totalPages) {
        authHeader = await calculateAuthorizationHeader({
            id: platform.cleanedID,
            key: platform.cleanedKEY,
            host: platform.apiUrl,
            url: '/api/authn/v2/teams?page='+pageNumber+'&size='+perPage,
            method: 'GET'
        })
        const teamsResponse = await axios.get('https://'+platform.apiUrl+'/api/authn/v2/teams', {
            headers: {
                'Authorization': authHeader
            },
            params: {
                page: pageNumber,
                size: perPage
            }
        });
        platformTeams = platformTeams.concat(teamsResponse.data._embedded);
        totalPages = teamsResponse.data.page.total_pages;
        pageNumber++;
    }
    //console.log(platformTeams);
    console.log(chalk.green('All teams fetched from the platform'));

    //get all business units from the platform
    authHeader = await calculateAuthorizationHeader({
        id: platform.cleanedID,
        key: platform.cleanedKEY,
        host: platform.apiUrl,
        url: '/api/authn/v2/business_units',
        method: 'GET'
    })
    const businessUnits = await axios.get('https://'+platform.apiUrl+'/api/authn/v2/business_units', {
        headers: {
            'Authorization': authHeader
        }
    
    });
    console.log(chalk.green('All business units fetched from the platform'));

    //get all policies from the platform
    pageNumber = 0;
    perPage = 50;
    totalPages = Infinity;
    let policies:any = []

    while (pageNumber < totalPages) {
        authHeader = await calculateAuthorizationHeader({
            id: platform.cleanedID,
            key: platform.cleanedKEY,
            host: platform.apiUrl,
            url: '/appsec/v1/policies?page='+pageNumber+'&size='+perPage,
            method: 'GET'
        })
        const policiesResponse = await axios.get('https://'+platform.apiUrl+'/appsec/v1/policies', {
            headers: {
                'Authorization': authHeader
            },
            params: {
                page: pageNumber,
                size: perPage
            }
        });
        policies = policies.concat(policiesResponse.data._embedded);
        totalPages = policiesResponse.data.page.total_pages;
        pageNumber++;
    }
    console.log(chalk.green('All policies fetched from the platform'));


    console.log("\n\n")
    console.log(chalk.green('Porfiles found: ', apps.length));
    for ( let app of apps ) {
        console.log(chalk.green('Updating profile: ', app.App____name));
        

        console.log(chalk.green('Profile GUID: '+app.App____GUID))

        //find the policy guid
        let policy_guid = '';
        for ( let policy of policies[0].policy_versions ) {
            if ( policy.name == app.policy ) {
                policy_guid = policy.guid;
            }
        }

        //find the business unit guid
        let business_unit_guid = [];
        for ( let businessUnit of businessUnits.data._embedded.business_units ) {
            if ( businessUnit.bu_name == app.Business____Unit ) {
                business_unit_guid.push({
                    "guid": businessUnit.bu_id
            });
            }
        }


        //findings team guids
        let team_guids:any = [];
        if ( app.Teams != '' ) {
            for ( let team of app.Teams.split(',') ) {
                for ( let teamData of platformTeams[0].teams ) {
                    if ( teamData.team_name === team ) {
                        team_guids.push({
                            "guid": teamData.team_id
                        }) 
                    }
                }
            }
            
        }
        

        //creating custom fields payload from all CSV fields after column 6
        let custom_fields = [];
        const keys = Object.keys(app);
        const fieldsAfterSixth = keys.slice(6);

        for (let key of fieldsAfterSixth) {
            if (key != '') {
                custom_fields.push({
                    "name": key.replace('____', ' '),
                    "value": app[key]
                });
            }
        }

        const updatepayload:UpdatePayload = {
                "profile": {
                  "name": app.App____name,
                  "policies": [
                    {
                      "guid": policy_guid,
                      "is_default": true
                    }
                  ],
                  "custom_fields": [
                    ...custom_fields
                  ],
                  "description": null,
                  "business_criticality": app.Business____Criticality
                }
              }

        if (team_guids.length >= 1) {
            updatepayload.profile.teams = team_guids;
        }

        if ( business_unit_guid.length >=1 ) {
            updatepayload.profile.business_unit = business_unit_guid[0]
        }


        //console.log(JSON.stringify(updatepayload));


        // Define a delay function for rate limiting
        function delay(ms: number) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Rate limiting: wait for a specified amount of time before making the next update
        await delay(200); // Delay for 100 milliseconds (0,1 second) between updates, that would make 600 request per hour

        //update the app
        authHeader = await calculateAuthorizationHeader({
            id: platform.cleanedID,
            key: platform.cleanedKEY,
            host: platform.apiUrl,
            url: '/appsec/v1/applications/'+app.App____GUID,
            method: 'PUT'
        })

        const updateResponse = await axios.put('https://'+platform.apiUrl+'/appsec/v1/applications/'+app.App____GUID, updatepayload, {
            headers: {
                'Authorization': authHeader
            }
        });
        console.log(chalk.green('Profile updated: ', app.App____name));
        console.log("\n\n")

    }
}

interface Profile {
    name: string;
    business_unit?: Array<{ guid: string }>;
    policies: Array<{ guid: string; is_default: boolean }>;
    custom_fields: Array<{ name: string; value: string }>;
    description?: string; // Make description optional
    business_criticality: string;
    teams?: Array<{ guid: string }>; // Make teams optional
  }
  
  interface UpdatePayload {
    profile: Profile;
  }