use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub details: String,
}

impl AppError {
    pub fn new(code: &str, message: &str, details: &str) -> Self {
        Self {
            code: code.to_string(),
            message: message.to_string(),
            details: details.to_string(),
        }
    }
}

pub type AppResult<T> = Result<T, AppError>;
