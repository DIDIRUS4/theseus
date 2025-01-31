//! Theseus utility functions
pub mod fetch;
pub mod io;
pub mod jre;
pub mod platform;
pub mod utils;

/// Wrap a builder which uses a mut reference into one which outputs an owned value
macro_rules! wrap_ref_builder {
    ($id:ident = $init:expr => $transform:block) => {{
        let mut it = $init;
        {
            let $id = &mut it;
            $transform;
        }
        it
    }};
}
