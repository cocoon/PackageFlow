//! MCP Server modules for PackageFlow
//!
//! This module contains the extracted components from mcp_server.rs
//! for better maintainability and organization.

// Enabled modules
pub mod types;

// Modules to be populated incrementally
// pub mod state;
// pub mod security;
// pub mod templates;
// pub mod utils;
// pub mod store;
// pub mod background;

// Re-export types
pub use types::*;
