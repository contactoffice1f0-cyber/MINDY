package com.example.mindy.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.example.mindy.Task;
import com.fasterxml.jackson.annotation.JsonProperty;

public record TaskResponse(
        Long id,
        String taskName,
        LocalDate dueDate,
        String category,
        @JsonProperty("is_completed") boolean isCompleted,
        LocalDateTime createdAt) {

    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTaskName(),
                task.getDueDate(),
                task.getCategory() == null ? null : task.getCategory().getName(),
                task.getIsCompleted(),
                task.getCreatedAt());
    }
}
