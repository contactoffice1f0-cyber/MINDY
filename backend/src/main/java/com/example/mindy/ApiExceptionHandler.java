package com.example.mindy;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleResponseStatus(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode())
                .body(Map.of("error", exception.getReason() == null ? "request failed" : exception.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException exception) {
        String message = "validation error";
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            String defaultMessage = fieldError.getDefaultMessage();
            if (defaultMessage != null && !defaultMessage.isBlank()) {
                message = defaultMessage;
                break;
            }
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", message));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadable(HttpMessageNotReadableException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "request body is invalid"));
    }
}
