use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

const DEFAULT_CAPACITY: usize = 500;

#[derive(Debug, Clone)]
pub struct ConsoleBuffer {
    inner: Arc<Mutex<VecDeque<String>>>,
    capacity: usize,
}

impl ConsoleBuffer {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(VecDeque::with_capacity(DEFAULT_CAPACITY))),
            capacity: DEFAULT_CAPACITY,
        }
    }

    pub fn push(&self, line: String) {
        let mut buf = self.inner.lock().unwrap();
        if buf.len() >= self.capacity {
            buf.pop_front();
        }
        buf.push_back(line);
    }

    pub fn lines(&self) -> Vec<String> {
        let buf = self.inner.lock().unwrap();
        buf.iter().cloned().collect()
    }
}

impl Default for ConsoleBuffer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capacity_enforcement() {
        let buf = ConsoleBuffer {
            inner: Arc::new(Mutex::new(VecDeque::with_capacity(3))),
            capacity: 3,
        };

        buf.push("line1".to_string());
        buf.push("line2".to_string());
        buf.push("line3".to_string());
        buf.push("line4".to_string());

        let lines = buf.lines();
        assert_eq!(lines.len(), 3);
        assert_eq!(lines[0], "line2");
        assert_eq!(lines[2], "line4");
    }

    #[test]
    fn test_push_and_get_lines() {
        let buf = ConsoleBuffer::new();

        buf.push("hello".to_string());
        buf.push("world".to_string());

        let lines = buf.lines();
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0], "hello");
        assert_eq!(lines[1], "world");
    }

    #[test]
    fn test_wrap_around_behavior() {
        let buf = ConsoleBuffer {
            inner: Arc::new(Mutex::new(VecDeque::with_capacity(2))),
            capacity: 2,
        };

        buf.push("a".to_string());
        buf.push("b".to_string());
        buf.push("c".to_string());
        buf.push("d".to_string());

        let lines = buf.lines();
        assert_eq!(lines, vec!["c".to_string(), "d".to_string()]);
    }

    #[test]
    fn test_empty_buffer() {
        let buf = ConsoleBuffer::new();
        assert!(buf.lines().is_empty());
    }
}
