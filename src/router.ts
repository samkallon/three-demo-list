import { createRouter, createWebHashHistory} from "vue-router";

const routes = [
    {
        path: "/",
        name: "Home",
        component: () => import("./components/DemoList.vue"),
    },
    {
        path: "/modelLighting",
        name: "modelLighting",
        component: () => import("./threeDemos/modelLighting.vue"),
    }
]

const options = {
    history: createWebHashHistory(),
    routes
}

const router = createRouter(options)
export default router
