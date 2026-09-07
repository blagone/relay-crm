export type Json=string|number|boolean|null|{[key:string]:Json|undefined}|Json[];
export type Database={public:{Tables:{
 workspaces:{Row:{id:string;name:string;currency:string;created_by:string;created_at:string};Insert:never;Update:never;Relationships:[]};
 memberships:{Row:{workspace_id:string;user_id:string;role:"owner"|"manager"|"viewer";created_at:string};Insert:never;Update:never;Relationships:[]};
 clients:{Row:{id:string;workspace_id:string;name:string;company:string;email:string|null;phone:string|null;created_at:string;updated_at:string;archived_at:string|null;version:number};Insert:never;Update:never;Relationships:[]};
 inquiries:{Row:{id:string;workspace_id:string;client_id:string;title:string;description:string;source:"website"|"telegram"|"referral"|"other";status:"new"|"contacted"|"proposal"|"won"|"lost";amount_minor:number;assignee_id:string|null;next_contact_on:string|null;created_at:string;updated_at:string;closed_at:string|null;archived_at:string|null;version:number};Insert:never;Update:never;Relationships:[]};
 audit_events:{Row:{id:number;workspace_id:string;inquiry_id:string|null;actor_id:string|null;action:string;entity_type:string;entity_id:string;metadata:Json;created_at:string};Insert:never;Update:never;Relationships:[]}
};Views:Record<string,never>;Functions:{bootstrap_workspace:{Args:{workspace_name:string};Returns:string}};Enums:{member_role:"owner"|"manager"|"viewer";inquiry_status:"new"|"contacted"|"proposal"|"won"|"lost";inquiry_source:"website"|"telegram"|"referral"|"other";audit_action:string};CompositeTypes:Record<string,never>}};
