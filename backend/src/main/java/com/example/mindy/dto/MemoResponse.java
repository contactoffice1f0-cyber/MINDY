package com.example.mindy.dto;

import java.time.LocalDateTime;

import com.example.mindy.Memo;

public record MemoResponse(Long id, String memoContent, LocalDateTime createdAt) {

    public static MemoResponse from(Memo memo) {
        return new MemoResponse(memo.getId(), memo.getMemoContent(), memo.getCreatedAt());
    }
}
