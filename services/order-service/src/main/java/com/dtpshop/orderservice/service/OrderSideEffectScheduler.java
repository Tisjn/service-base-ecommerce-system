package com.dtpshop.orderservice.service;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

final class OrderSideEffectScheduler {

    private OrderSideEffectScheduler() {
    }

    static void afterCommit(Runnable sideEffect) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            sideEffect.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                sideEffect.run();
            }
        });
    }
}
