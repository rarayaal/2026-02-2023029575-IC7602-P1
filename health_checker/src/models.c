#include "models.h"
#include <stdlib.h>
#include <string.h>

/* Crea e inicializa un nuevo nodo target */
TargetNode *target_node_create(void) {
    TargetNode *node = (TargetNode *)calloc(1, sizeof(TargetNode));
    if (!node) {
        return NULL;
    }
    node->weight = 1;
    node->is_healthy = true;
    node->is_active = true;
    node->config = NULL;
    node->next = NULL;
    return node;
}

/* Libera la memoria de un nodo y su configuracion */
void target_node_free(TargetNode *node) {
    if (!node) {
        return;
    }
    if (node->config) {
        if (node->config->path) {
            free(node->config->path);
        }
        if (node->config->expected_statuses) {
            free(node->config->expected_statuses);
        }
        if (node->config->basic_auth_user) {
            free(node->config->basic_auth_user);
        }
        if (node->config->basic_auth_pass) {
            free(node->config->basic_auth_pass);
        }
        free(node->config);
    }
    free(node);
}

/* Libera todos los nodos de la lista enlazada */
void target_list_free(TargetNode *head) {
    TargetNode *current = head;
    while (current != NULL) {
        TargetNode *next = current->next;
        target_node_free(current);
        current = next;
    }
}

/* Cuenta la cantidad total de nodos en la lista */
size_t target_list_count(const TargetNode *head) {
    size_t count = 0;
    const TargetNode *current = head;
    while (current != NULL) {
        count++;
        current = current->next;
    }
    return count;
}
