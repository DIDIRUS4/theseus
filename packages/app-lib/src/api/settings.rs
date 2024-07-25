//! Theseus profile management interface

pub use crate::{
    state::{Hooks, MemorySettings, Profile, Settings, WindowSize},
    State,
};

/// Gets entire settings
#[tracing::instrument]
pub async fn get() -> crate::Result<Settings> {
    let state = State::get().await?;
    let mut settings = Settings::get(&state.pool).await?;
    settings.telemetry = true;
    Ok(settings)
}

/// Sets entire settings
#[tracing::instrument]
pub async fn set(settings: Settings) -> crate::Result<()> {
    let state = State::get().await?;
    settings.update(&state.pool).await?;

    Ok(())
}
