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
    },
    {
        path: "/clouds",
        name: "clouds",
        component: () => import("./threeDemos/clouds/clouds.vue"),
    },
    {
        path: "/basicMesh",
        name: "basicMesh",
        component: () => import("./threeDemos/basicMesh.vue"),
    }
]

const options = {
    history: createWebHashHistory(),
    routes
}

const router = createRouter(options)
export default router
