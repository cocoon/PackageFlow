// Step Template commands for custom template management
// Updated to use SQLite database for storage

use crate::models::step_template::{
    CustomStepTemplate, CustomTemplateResponse, ListCustomTemplatesResponse,
};
use crate::repositories::TemplateRepository;
use crate::DatabaseState;

/// Load all custom templates from SQLite
#[tauri::command]
pub async fn load_custom_step_templates(
    db: tauri::State<'_, DatabaseState>,
) -> Result<ListCustomTemplatesResponse, String> {
    let repo = TemplateRepository::new(db.0.as_ref().clone());
    let templates = repo.list()?;

    Ok(ListCustomTemplatesResponse {
        success: true,
        templates: Some(templates),
        error: None,
    })
}

/// Save a custom template to SQLite
#[tauri::command]
pub async fn save_custom_step_template(
    db: tauri::State<'_, DatabaseState>,
    template: CustomStepTemplate,
) -> Result<CustomTemplateResponse, String> {
    let repo = TemplateRepository::new(db.0.as_ref().clone());
    repo.save(&template)?;

    Ok(CustomTemplateResponse {
        success: true,
        template: Some(template),
        error: None,
    })
}

/// Delete a custom template from SQLite
#[tauri::command]
pub async fn delete_custom_step_template(
    db: tauri::State<'_, DatabaseState>,
    template_id: String,
) -> Result<CustomTemplateResponse, String> {
    let repo = TemplateRepository::new(db.0.as_ref().clone());
    let deleted = repo.delete(&template_id)?;

    if !deleted {
        return Ok(CustomTemplateResponse {
            success: false,
            template: None,
            error: Some(format!("Template with ID '{}' not found", template_id)),
        });
    }

    Ok(CustomTemplateResponse {
        success: true,
        template: None,
        error: None,
    })
}
