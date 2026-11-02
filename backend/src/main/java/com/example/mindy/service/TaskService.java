package com.example.mindy.service;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.example.mindy.Category;
import com.example.mindy.CategoryRepository;
import com.example.mindy.Task;
import com.example.mindy.TaskRepository;
import com.example.mindy.dto.TaskRequest;
import com.example.mindy.dto.TaskResponse;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final CategoryRepository categoryRepository;

    public TaskService(TaskRepository taskRepository, CategoryRepository categoryRepository) {
        this.taskRepository = taskRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> findAll() {
        return taskRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"))
                .stream()
                .map(TaskResponse::from)
                .toList();
    }

    @Transactional
    public TaskResponse create(TaskRequest request) {
        Task task = new Task();
        applyRequest(task, request);
        task.setIsCompleted(false);
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse update(Long id, TaskRequest request) {
        Task task = findTask(id);
        applyRequest(task, request);
        task.setIsCompleted(request.getIsCompleted());
        return TaskResponse.from(taskRepository.save(task));
    }

    @Transactional
    public void delete(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "task not found");
        }
        taskRepository.deleteById(id);
    }

    private Task findTask(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task not found"));
    }

    private void applyRequest(Task task, TaskRequest request) {
        task.setTaskName(request.getTaskName().trim());
        task.setDueDate(request.getDueDate());
        task.setCategory(resolveCategory(request.getCategory()));
    }

    private Category resolveCategory(String categoryName) {
        if (categoryName == null || categoryName.isBlank()) {
            return null;
        }
        String name = categoryName.trim();
        return categoryRepository.findByName(name)
                .orElseGet(() -> categoryRepository.save(new Category(name)));
    }
}
