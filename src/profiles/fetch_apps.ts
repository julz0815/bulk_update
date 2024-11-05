import axios, { AxiosResponse, AxiosError } from 'axios';
import { selectPlatform, calculateAuthorizationHeader } from '../auth'
import fs from 'fs';
import chalk from 'chalk'

export async function fetchApps(file:any, apiID:any, apiKey:any) {
    const platform = await selectPlatform(apiID, apiKey);

    

    let pageNumber = 0;
    let perPage = 50;
    let totalPages = Infinity;

    let apps = []
    while (pageNumber < totalPages) {
        const authHeader = await calculateAuthorizationHeader({
            id: platform.cleanedID,
            key: platform.cleanedKEY,
            host: platform.apiUrl,
            url: '/appsec/v1/applications/?page='+pageNumber+'&size='+perPage,
            method: 'GET'
        })

        const response = await axios.get('https://'+platform.apiUrl+'/appsec/v1/applications/', {
            headers: {
                'Authorization': authHeader
            },
            params: {
                page: pageNumber,
                size: perPage
            }
        });
        apps = apps.concat(response.data._embedded.applications);
        totalPages = response.data.page.total_pages;
        pageNumber++;
    }    

    async function countCustomFields(apps:any) {
        //count custom fields and find largest number of custom fields
        let custom_fields_count = 0;
        let custom_field_names = [];
        for ( let app of apps ) {
            if ( app.profile.custom_fields != null){
                let custom_fields_count_new = app.profile.custom_fields.length
                if (custom_fields_count_new > custom_fields_count){
                    custom_fields_count = custom_fields_count_new
                    for ( let i=0; i < custom_fields_count_new; i++){
                        custom_field_names.push(app.profile.custom_fields[i].name)
                    }
                }
            }
        }
        return {custom_fields_count, custom_field_names}
    }
    const { custom_fields_count, custom_field_names } = await countCustomFields(apps);
    
    console.log('Largest number of custom fields found: ', custom_fields_count);
    console.log('Custom field names found: ', custom_field_names);


    //format "App name", "Business Unit", "policy","Business Criticality","Teams","custom fields"
    let csv = '';
    let custom_fields = [];
    let teams= [];

    //crete csv header
    csv = `"App GUID",`;
    csv += `"App name",`;
    csv += `"Business Unit",`;
    csv += `"policy",`;
    csv += `"Business Criticality",`;
    csv += `"Teams",`;
    for ( let custom_field_name of custom_field_names ) {
        csv += `"${custom_field_name}",`;
    }
    csv += '\n';


    for ( let profiles of apps ) {
        let teams= [];
        console.log(chalk.green('Creating data for Profile: ', profiles.profile.name));

        csv += `"${profiles.guid}",`;
        csv += `"${profiles.profile.name}",`;
        csv += `"${profiles.profile.business_unit.name}",`;
        csv += `"${profiles.profile.policies[0].name}",`;
        csv += `"${profiles.profile.business_criticality}",`;
        for ( let team of profiles.profile.teams ) {
            teams.push(team.team_name);
        }
        csv += `"${teams.join(",")}",`;
        for ( let custom_field_name of custom_field_names ) {
            let custom_field_value = '';
            if (profiles.profile.custom_fields != null){
                for ( let custom_field of profiles.profile.custom_fields ) {
                    if (custom_field.name == custom_field_name){
                        custom_field_value = custom_field.value;
                    }
                }
            }
            csv += `"${custom_field_value}",`;
        }
        csv += '\n';
    }
    fs.writeFileSync(file, csv);

    
}