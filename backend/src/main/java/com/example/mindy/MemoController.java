package com.example.mindy;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.mindy.dto.MemoRequest;
import com.example.mindy.dto.MemoResponse;
import com.example.mindy.service.MemoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/memos")
public class MemoController {

    private final MemoService memoService;

    public MemoController(MemoService memoService) {
        this.memoService = memoService;
    }

    @GetMapping
    public List<MemoResponse> getAllMemos() {
        return memoService.findAll();
    }

    @PostMapping
    public ResponseEntity<MemoResponse> createMemo(@Valid @RequestBody MemoRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(memoService.create(request));
    }

    @PutMapping("/{id}")
    public MemoResponse updateMemo(@PathVariable Long id, @Valid @RequestBody MemoRequest request) {
        return memoService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteMemo(@PathVariable Long id) {
        memoService.delete(id);
        return Map.of("result", "success", "message", "メモを削除しました");
    }
}
